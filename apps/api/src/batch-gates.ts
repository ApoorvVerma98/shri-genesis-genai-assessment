import type { BatchManifest, ManifestEntry } from "@vector-forge/shared";

export interface AssessmentBatchGateResult {
  ok: boolean;
  errors: string[];
}

/** Required checks before promoting staged assessment output to canonical paths. */
export function validateAssessmentBatchForPromotion(manifest: BatchManifest): AssessmentBatchGateResult {
  const errors: string[] = [];
  const entries = manifest.entries ?? [];

  if (manifest.requested !== entries.length) {
    errors.push(
      `Entry count ${entries.length} does not match requested ${manifest.requested}`,
    );
  }
  if (manifest.generated !== manifest.requested) {
    errors.push(
      `Generated count ${manifest.generated} does not match requested ${manifest.requested}`,
    );
  }
  if (manifest.attempted !== manifest.requested) {
    errors.push(`Attempted ${manifest.attempted} does not match requested ${manifest.requested}`);
  }
  if ((manifest.failed ?? 0) > 0) {
    errors.push(`${manifest.failed} design(s) failed generation`);
  }
  if ((manifest.validationFailed ?? 0) > 0) {
    errors.push(`${manifest.validationFailed} design(s) failed validation`);
  }

  for (const entry of entries) {
    const issues = entryIssues(entry);
    if (issues.length) errors.push(`${entry.id}: ${issues.join("; ")}`);
  }

  return { ok: errors.length === 0, errors };
}

function entryIssues(entry: ManifestEntry): string[] {
  const issues: string[] = [];
  if (!entry.outputPath?.trim()) issues.push("missing outputPath");
  if (entry.validationStatus !== "passed") {
    issues.push(`validationStatus=${entry.validationStatus}`);
  }
  if (entry.error) issues.push(`error=${entry.error}`);
  if (entry.contentMode === "unknown") {
    issues.push("unknown provenance");
  }
  return issues;
}

export function assertAssessmentBatchForPromotion(manifest: BatchManifest): void {
  const gate = validateAssessmentBatchForPromotion(manifest);
  if (!gate.ok) {
    throw new Error(`Assessment batch not promotable: ${gate.errors.join(" | ")}`);
  }
}
