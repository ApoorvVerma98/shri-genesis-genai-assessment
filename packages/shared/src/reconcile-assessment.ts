import type { BatchManifest, ManifestEntry } from "./schemas.js";

export interface ReconcileAssessmentInput {
  baselineManifest: BatchManifest;
  /** Repo-relative or absolute paths resolved by caller. */
  readSvg: (relativeOutputPath: string) => Promise<{ svg: string; resolvedFrom: "outputs" | "archive" } | null>;
  validateEntry: (svg: string, entry: ManifestEntry) => {
    contentHash?: string;
    structureHash?: string;
    issues: string[];
  };
}

export interface ReconcileAssessmentResult {
  manifest: BatchManifest;
  stats: {
    entries: number;
    matchedBaselineHash: number;
    unknownProvenance: number;
    resolvedFromArchive: number;
    missingFile: number;
  };
}

const AGGREGATE_NOTE =
  "Per-entry AI/fallback for regenerated vf-NNNN files is unknown (100-entry manifest was overwritten). " +
  "Aggregate metrics from the 2026-10-12 phase-2 batch are preserved in reports/backups and reports/execution-report.json " +
  "(6 AI / 94 fallback) but are not assigned to individual file IDs.";

export async function reconcileAssessmentManifest(
  input: ReconcileAssessmentInput,
): Promise<ReconcileAssessmentResult> {
  const entries: ManifestEntry[] = [];
  let matchedBaselineHash = 0;
  let unknownProvenance = 0;
  let resolvedFromArchive = 0;
  let missingFile = 0;

  for (const baseline of input.baselineManifest.entries) {
    const loaded = await input.readSvg(baseline.outputPath);
    if (!loaded) {
      missingFile++;
      entries.push({
        ...baseline,
        validationStatus: "failed",
        validationIssues: ["SVG file missing under outputs/ and outputs-phase1-archive/"],
        provenanceNote: "File missing during reconciliation.",
      });
      continue;
    }

    if (loaded.resolvedFrom === "archive") resolvedFromArchive++;

    const validation = input.validateEntry(loaded.svg, baseline);
    const contentHash = validation.contentHash ?? baseline.contentHash;
    const structureHash = validation.structureHash ?? baseline.structureHash;
    const passed = validation.issues.length === 0;

    const hashMatchesBaseline =
      !!baseline.contentHash && !!contentHash && baseline.contentHash === contentHash;

    if (hashMatchesBaseline) {
      matchedBaselineHash++;
      entries.push({
        ...baseline,
        contentHash,
        structureHash,
        validationStatus: passed ? "passed" : "failed",
        validationIssues: validation.issues,
      });
      continue;
    }

    unknownProvenance++;
    entries.push({
      ...baseline,
      contentHash,
      structureHash,
      contentMode: "unknown",
      aiProvider: undefined,
      aiModel: undefined,
      aiAttempted: undefined,
      fallbackReason: undefined,
      provenanceNote:
        loaded.resolvedFrom === "outputs"
          ? `SVG differs from phase-1 baseline hash. ${AGGREGATE_NOTE}`
          : `Using phase-1 archive copy; differs from baseline record. ${AGGREGATE_NOTE}`,
      validationStatus: passed ? "passed" : "failed",
      validationIssues: validation.issues,
    });
  }

  const validationPassed = entries.filter((e) => e.validationStatus === "passed").length;
  const validationFailed = entries.filter((e) => e.validationStatus === "failed").length;
  const unknownCount = entries.filter((e) => e.contentMode === "unknown").length;
  const fallbackCount = entries.filter((e) => e.contentMode === "fallback").length;

  const manifest: BatchManifest = {
    collection: "assessment",
    aggregateProvenanceNote: unknownCount > 0 ? AGGREGATE_NOTE : undefined,
    requested: entries.length,
    attempted: entries.length,
    generated: entries.length - missingFile,
    validationPassed,
    validationFailed,
    failed: missingFile,
    aiGenerated: entries.filter((e) => e.contentMode === "ai").length,
    fallbackGenerated: fallbackCount,
    aiAttempted: entries.filter((e) => e.aiAttempted === true).length,
    aiFailedThenFallback: entries.filter(
      (e) => e.aiAttempted === true && e.contentMode === "fallback",
    ).length,
    startedAt: input.baselineManifest.startedAt,
    completedAt: new Date().toISOString(),
    totalDurationMs: 0,
    batchConfig: input.baselineManifest.batchConfig ?? { seed: 42 },
    entries,
  };

  if (unknownCount > 0) {
    manifest.aggregateProvenanceNote = AGGREGATE_NOTE;
  }

  return {
    manifest,
    stats: {
      entries: entries.length,
      matchedBaselineHash,
      unknownProvenance,
      resolvedFromArchive,
      missingFile,
    },
  };
}
