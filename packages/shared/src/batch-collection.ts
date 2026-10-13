import type { BatchJobRequest } from "./batch-config.js";

/** Canonical 100-design assessment set (legacy count/seed batches). */
export type BatchCollection = "assessment" | "targeted";

/**
 * Targeted segment batches never write the assessment manifest.
 * Legacy `{ count, seed }` batches are assessment collection runs.
 */
export function resolveBatchCollection(request: BatchJobRequest): BatchCollection {
  if (request.segments?.length) return "targeted";
  return "assessment";
}

export function assessmentManifestRelPath(): string {
  return "assessment/manifest.json";
}

export function targetedRunManifestRelPath(batchRunId: string): string {
  return `runs/${batchRunId}/manifest.json`;
}
