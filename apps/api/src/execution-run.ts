import fs from "node:fs/promises";
import path from "node:path";
import type { BatchManifest } from "@vector-forge/shared";
import { assertAssessmentBatchForPromotion } from "./batch-gates.js";
import { REPORTS_DIR } from "./paths.js";

export type ExecutionRunStatus = "in_progress" | "completed" | "failed";

export interface ExecutionRunRecord {
  status: ExecutionRunStatus;
  runId: string;
  collection: "assessment" | "targeted";
  requested: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  manifestPath?: string;
  /** Set only when status is completed and manifest evidence exists. */
  manifestEntryCount?: number;
  message?: string;
}

export const EXECUTION_RUN_PATH = path.join(REPORTS_DIR, "execution-run.json");

export async function writeExecutionRun(record: ExecutionRunRecord): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(EXECUTION_RUN_PATH, JSON.stringify(record, null, 2), "utf8");
}

export async function readExecutionRun(): Promise<ExecutionRunRecord | null> {
  try {
    const raw = await fs.readFile(EXECUTION_RUN_PATH, "utf8");
    return JSON.parse(raw) as ExecutionRunRecord;
  } catch {
    return null;
  }
}

const STALE_IN_PROGRESS_MS = 15 * 60 * 1000;

/** Mark long-stale in_progress runs as failed/interrupted (does not claim batch success). */
export async function reconcileStaleExecutionRun(): Promise<ExecutionRunRecord | null> {
  const run = await readExecutionRun();
  if (!run || run.status !== "in_progress") return run;
  const started = Date.parse(run.startedAt);
  if (!Number.isFinite(started) || Date.now() - started <= STALE_IN_PROGRESS_MS) return run;
  const updated: ExecutionRunRecord = {
    ...run,
    status: "failed",
    completedAt: new Date().toISOString(),
    error: "Run interrupted or process exited (stale in_progress)",
    message:
      "Batch did not complete; execution-report.json was not updated for this run.",
  };
  await writeExecutionRun(updated);
  return updated;
}

export interface AssessmentExecutionReport {
  status: "completed";
  phase: string;
  runId: string;
  collection: "assessment";
  canonicalManifestPath: string;
  requested: number;
  attempted: number;
  generated: number;
  validationPassed: number;
  validationFailed: number;
  failed: number;
  aiGeneratedCount: number;
  fallbackCount: number;
  unknownProvenanceCount: number;
  aiAttemptedCount: number;
  aiFailedThenFallback: number;
  totalDurationMs: number;
  averageMsPerDesign: number;
  aiProvider: unknown;
  batchConfig: unknown;
  validationSummary: { passed: number; failed: number };
  knownLimitations: string[];
  startedAt: string;
  completedAt: string;
  evidenceNote: string;
}

export function buildCompletedAssessmentReport(
  runId: string,
  manifest: BatchManifest,
  aiProvider: unknown,
  startedAt: string,
  manifestRelPath: string,
): AssessmentExecutionReport {
  const entries = manifest.entries ?? [];
  const ai = entries.filter((e) => e.contentMode === "ai").length;
  const fallback = entries.filter((e) => e.contentMode === "fallback").length;
  const unknown = entries.filter((e) => e.contentMode === "unknown").length;
  const aiFailedFallback = entries.filter(
    (e) => e.aiAttempted && e.contentMode === "fallback",
  ).length;

  assertAssessmentBatchForPromotion(manifest);

  return {
    status: "completed",
    phase: "assessment-regeneration",
    runId,
    collection: "assessment",
    canonicalManifestPath: manifestRelPath,
    requested: manifest.requested,
    attempted: manifest.attempted,
    generated: manifest.generated,
    validationPassed: manifest.validationPassed,
    validationFailed: manifest.validationFailed,
    failed: manifest.failed,
    aiGeneratedCount: ai,
    fallbackCount: fallback,
    unknownProvenanceCount: unknown,
    aiAttemptedCount: manifest.aiAttempted ?? entries.filter((e) => e.aiAttempted).length,
    aiFailedThenFallback: manifest.aiFailedThenFallback ?? aiFailedFallback,
    totalDurationMs: manifest.totalDurationMs,
    averageMsPerDesign: manifest.generated
      ? Math.round(manifest.totalDurationMs / manifest.generated)
      : 0,
    aiProvider,
    batchConfig: manifest.batchConfig,
    validationSummary: {
      passed: manifest.validationPassed,
      failed: manifest.validationFailed,
    },
    knownLimitations: [
      "Text wrapping uses character estimates, not font metrics.",
      "Automated overlap detection is heuristic only.",
    ],
    startedAt,
    completedAt: manifest.completedAt,
    evidenceNote:
      "Report written only after a completed assessment batch with full manifest entry count matching requested.",
  };
}

export async function writeCompletedAssessmentReports(
  report: AssessmentExecutionReport,
): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  const jsonPath = path.join(REPORTS_DIR, "execution-report.json");
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const md = `# VectorForge — Execution Report

**Status:** ${report.status}  
**Run ID:** ${report.runId}  
**Completed:** ${report.completedAt}

| Metric | Value |
|--------|------:|
| Requested | ${report.requested} |
| Generated | ${report.generated} |
| Validation passed | ${report.validationPassed} |
| AI-generated | ${report.aiGeneratedCount} |
| Fallback | ${report.fallbackCount} |
| Unknown provenance | ${report.unknownProvenanceCount} |
| AI → fallback | ${report.aiFailedThenFallback} |

${report.evidenceNote}

Canonical manifest: \`${report.canonicalManifestPath}\`
`;
  await fs.writeFile(path.join(REPORTS_DIR, "execution-report.md"), md, "utf8");
}
