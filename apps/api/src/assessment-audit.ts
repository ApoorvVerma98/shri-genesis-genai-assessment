import {
  BatchManifestSchema,
  CATEGORIES,
  LAYOUT_FAMILIES,
  buildManifestCoverageReport,
  type BatchManifest,
  type ManifestEntry,
} from "@vector-forge/shared";
import {
  detectHeadlineRepetition,
  detectNearDuplicateBriefs,
  findExactDuplicates,
  validateSvgStructure,
} from "@vector-forge/validation";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  readExecutionRun,
  reconcileStaleExecutionRun,
  type ExecutionRunRecord,
} from "./execution-run.js";
import { readAssessmentManifest } from "./manifest-io.js";
import { ASSESSMENT_PDF_REL, buildPdfTraceabilityRequirements } from "./pdf-traceability.js";
import { REPO_ROOT, REPORTS_DIR, getManifestPath, resolveOutputDir } from "./paths.js";

export interface ProvenanceCounts {
  ai: number;
  fallback: number;
  unknown: number;
  hybrid: number;
  failed: number;
  missingSvg: number;
}

export interface ReconciliationReport {
  canonicalManifestPath: string;
  canonicalOutputDir: string;
  staleManifestPaths: { path: string; reason: string; entryCount?: number }[];
  provenance: ProvenanceCounts;
  orphanSvgCount: number;
  orphanSvgSample: string[];
  duplicateHeadlineGroups: number;
  nearDuplicatePairs: number;
  exactDuplicateContentGroups: number;
  structuralValidation: { passed: number; failed: number };
  coverage: ReturnType<typeof buildManifestCoverageReport>;
  executionRun: ExecutionRunRecord | null;
  executionRunInterpretation: string;
  aggregateProvenanceNote?: string;
  generatedAt: string;
}

export type RequirementStatus =
  | "implemented"
  | "demonstrated"
  | "verified"
  | "partial"
  | "failed"
  | "not_verified";

export interface TraceabilityRequirement {
  id: string;
  area: string;
  title: string;
  meaning: string;
  status: RequirementStatus;
  verification: "automatic" | "manual" | "not_verified";
  implementation: string[];
  evidence: string[];
  remainingWork: string;
}

export interface AssessmentTraceability {
  generatedAt: string;
  pdfAvailable: boolean;
  pdfPath: string | null;
  canonicalManifestPath: string;
  reconciliation: ReconciliationReport;
  requirements: TraceabilityRequirement[];
  blockers: string[];
}

const STALE_RUN_MS = 15 * 60 * 1000;

export function interpretExecutionRun(run: ExecutionRunRecord | null): string {
  if (!run) return "No execution-run.json recorded.";
  if (run.status === "completed") {
    return `Last recorded batch completed (${run.runId}).`;
  }
  if (run.status === "failed") {
    return `Last batch failed (${run.runId}): ${run.error ?? "unknown error"}.`;
  }
  const started = Date.parse(run.startedAt);
  if (run.status === "in_progress" && Number.isFinite(started)) {
    if (Date.now() - started > STALE_RUN_MS) {
      return `Run ${run.runId} appears INTERRUPTED (in_progress since ${run.startedAt}). Do not treat execution-report.json as describing this run.`;
    }
    return `Batch in progress (${run.runId}) since ${run.startedAt}.`;
  }
  return `Run status: ${run.status}`;
}

function countProvenance(entries: ManifestEntry[]): ProvenanceCounts {
  let missingSvg = 0;
  const ai = entries.filter((e) => e.contentMode === "ai").length;
  const fallback = entries.filter((e) => e.contentMode === "fallback").length;
  const unknown = entries.filter((e) => e.contentMode === "unknown").length;
  const hybrid = entries.filter((e) => e.contentMode === "hybrid").length;
  const failed = entries.filter((e) => e.validationStatus !== "passed").length;
  return { ai, fallback, unknown, hybrid, failed, missingSvg };
}

async function listOrphanSvgs(
  manifestPaths: Set<string>,
  outputRoot: string,
): Promise<{ count: number; sample: string[] }> {
  const orphans: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "runs" || ent.name === "previews" || ent.name === "assessment") continue;
        await walk(full);
      } else if (ent.name.endsWith(".svg")) {
        const rel = path.relative(outputRoot, full).replace(/\\/g, "/");
        if (!manifestPaths.has(rel) && !rel.includes("ai-probe")) {
          orphans.push(rel);
        }
      }
    }
  }
  try {
    await walk(outputRoot);
  } catch {
    /* empty */
  }
  return { count: orphans.length, sample: orphans.slice(0, 15) };
}

export async function buildReconciliationReport(): Promise<ReconciliationReport> {
  const outputRoot = resolveOutputDir();
  const canonicalManifestPath = getManifestPath();
  const manifest = await readAssessmentManifest();
  if (!manifest) {
    throw new Error("Canonical assessment manifest not found");
  }
  const parsed = BatchManifestSchema.parse(manifest);
  const entries = parsed.entries;

  const staleManifestPaths: ReconciliationReport["staleManifestPaths"] = [];
  const apiStale = path.join(REPO_ROOT, "apps", "api", "outputs", "assessment", "manifest.json");
  try {
    const raw = await fs.readFile(apiStale, "utf8");
    const other = BatchManifestSchema.parse(JSON.parse(raw));
    const canonHash = createHash("sha256").update(JSON.stringify(parsed.entries)).digest("hex");
    const otherHash = createHash("sha256").update(JSON.stringify(other.entries)).digest("hex");
    if (canonHash !== otherHash) {
      staleManifestPaths.push({
        path: apiStale,
        reason: "Stale copy from mistaken OUTPUT_DIR cwd; not used by API/CLI after path fix.",
        entryCount: other.entries.length,
      });
    }
  } catch {
    /* no stale file */
  }

  const manifestPathSet = new Set(entries.map((e) => e.outputPath.replace(/\\/g, "/")));
  let passed = 0;
  let failed = 0;
  const hashes: string[] = [];
  const nearInput: { structureHash?: string; headline?: string; layoutFamily: string }[] = [];
  const headlines: string[] = [];
  const provenance = countProvenance(entries);

  for (const entry of entries) {
    headlines.push(entry.headline ?? entry.topic);
    nearInput.push({
      structureHash: entry.structureHash,
      headline: entry.headline ?? entry.topic,
      layoutFamily: entry.layoutFamily,
    });
    if (!entry.outputPath) {
      provenance.missingSvg++;
      failed++;
      continue;
    }
    const full = path.join(outputRoot, entry.outputPath);
    try {
      const svg = await fs.readFile(full, "utf8");
      const v = validateSvgStructure(svg);
      if (v.passed) passed++;
      else failed++;
      if (v.contentHash) hashes.push(v.contentHash);
    } catch {
      provenance.missingSvg++;
      failed++;
    }
  }

  const orphans = await listOrphanSvgs(manifestPathSet, outputRoot);
  const run = (await reconcileStaleExecutionRun()) ?? (await readExecutionRun());

  return {
    canonicalManifestPath,
    canonicalOutputDir: outputRoot,
    staleManifestPaths,
    provenance,
    orphanSvgCount: orphans.count,
    orphanSvgSample: orphans.sample,
    duplicateHeadlineGroups: detectHeadlineRepetition(headlines).size,
    nearDuplicatePairs: detectNearDuplicateBriefs(nearInput).length,
    exactDuplicateContentGroups: findExactDuplicates(hashes).size,
    structuralValidation: { passed, failed },
    coverage: buildManifestCoverageReport(parsed, "assessment"),
    executionRun: run,
    executionRunInterpretation: interpretExecutionRun(run),
    aggregateProvenanceNote: parsed.aggregateProvenanceNote,
    generatedAt: new Date().toISOString(),
  };
}

function buildRequirements(
  recon: ReconciliationReport,
  pdfAvailable: boolean,
): TraceabilityRequirement[] {
  return buildPdfTraceabilityRequirements(recon, pdfAvailable);
}

export async function buildAssessmentTraceability(): Promise<AssessmentTraceability> {
  const pdfPath = path.join(REPO_ROOT, ASSESSMENT_PDF_REL);
  let pdfAvailable = false;
  try {
    await fs.access(pdfPath);
    pdfAvailable = true;
  } catch {
    /* missing */
  }

  const reconciliation = await buildReconciliationReport();
  const requirements = buildRequirements(reconciliation, pdfAvailable);
  const blockers: string[] = [];

  if (reconciliation.provenance.unknown > 0) {
    blockers.push(
      `Canonical collection has ${reconciliation.provenance.unknown} entries with unknown AI/fallback provenance.`,
    );
  }
  if (reconciliation.executionRunInterpretation.includes("INTERRUPTED")) {
    blockers.push(reconciliation.executionRunInterpretation);
  }
  if (reconciliation.staleManifestPaths.length > 0) {
    blockers.push(
      `Stale manifest at apps/api/outputs/ — use ${reconciliation.canonicalManifestPath} only.`,
    );
  }
  if (!pdfAvailable) {
    blockers.push("Assessment PDF not found in repository; requirement wording not fully verified.");
  }

  return {
    generatedAt: new Date().toISOString(),
    pdfAvailable,
    pdfPath: pdfAvailable ? pdfPath : null,
    canonicalManifestPath: reconciliation.canonicalManifestPath,
    reconciliation,
    requirements,
    blockers,
  };
}

export async function writeAssessmentTraceabilityReports(): Promise<AssessmentTraceability> {
  const data = await buildAssessmentTraceability();
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(REPORTS_DIR, "assessment-traceability.json"),
    JSON.stringify(data, null, 2),
    "utf8",
  );

  const lines = [
    "# Assessment traceability",
    "",
    `Generated: ${data.generatedAt}`,
    "",
    `**Canonical manifest:** \`${data.canonicalManifestPath}\``,
    `**PDF in repo:** ${data.pdfAvailable ? "yes" : "no"}`,
    data.pdfPath ? `**PDF path:** \`${data.pdfPath}\`` : "",
    "",
    "See `docs/canonical-outputs.md` for output directory rules.",
    "",
    "## Provenance (canonical collection)",
    "",
    `| AI | Fallback | Unknown | Missing SVG |`,
    `|----|----------|---------|-------------|`,
    `| ${data.reconciliation.provenance.ai} | ${data.reconciliation.provenance.fallback} | ${data.reconciliation.provenance.unknown} | ${data.reconciliation.provenance.missingSvg} |`,
    "",
    "## Blockers",
    "",
    ...data.blockers.map((b) => `- ${b}`),
    "",
    "## Requirements",
    "",
    "| ID | Status | Title | Verification |",
    "|----|--------|-------|--------------|",
    ...data.requirements.map(
      (r) => `| ${r.id} | ${r.status} | ${r.title} | ${r.verification} |`,
    ),
    "",
    "## Requirement wording (from PDF)",
    "",
    ...data.requirements.map(
      (r) => `### ${r.id} — ${r.title}\n\n> ${r.meaning}\n`,
    ),
  ];
  await fs.writeFile(path.join(REPORTS_DIR, "assessment-traceability.md"), lines.join("\n"), "utf8");
  await fs.writeFile(
    path.join(REPORTS_DIR, "assessment-reconciliation.json"),
    JSON.stringify(data.reconciliation, null, 2),
    "utf8",
  );
  return data;
}
