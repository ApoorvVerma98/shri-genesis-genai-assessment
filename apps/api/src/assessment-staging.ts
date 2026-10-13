import type { BatchManifest } from "@vector-forge/shared";
import { assessmentManifestRelPath } from "@vector-forge/shared";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getAssessmentManifestPath, getLegacyManifestPath } from "./manifest-paths.js";
import { resolveOutputDir } from "./paths.js";

export function getAssessmentStagingDir(stagingRunId: string): string {
  return path.join(resolveOutputDir(), "staging", stagingRunId);
}

export function getStagingManifestPath(stagingRunId: string): string {
  return path.join(getAssessmentStagingDir(stagingRunId), "manifest.json");
}

async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Copy staged SVGs + manifest into canonical locations.
 * Writes manifest last. Creates rollback snapshot under staging/rollback-<id> before overwrite.
 */
export async function promoteAssessmentStaging(
  stagingRunId: string,
  manifest: BatchManifest,
): Promise<void> {
  const outputRoot = resolveOutputDir();
  const stagingRoot = getAssessmentStagingDir(stagingRunId);
  const rollbackRoot = path.join(outputRoot, "staging", `rollback-${stagingRunId}`);

  await fs.mkdir(rollbackRoot, { recursive: true });

  const assessmentPath = getAssessmentManifestPath();
  const legacyPath = getLegacyManifestPath();

  try {
    await fs.copyFile(assessmentPath, path.join(rollbackRoot, "assessment-manifest.json"));
  } catch {
    /* no prior manifest */
  }
  try {
    await fs.copyFile(legacyPath, path.join(rollbackRoot, "legacy-manifest.json"));
  } catch {
    /* optional */
  }

  const backedSvgs: string[] = [];
  for (const entry of manifest.entries) {
    if (!entry.outputPath) continue;
    const canonSvg = path.join(outputRoot, entry.outputPath);
    const stagedSvg = path.join(stagingRoot, entry.outputPath);
    const rollbackSvg = path.join(rollbackRoot, "outputs", entry.outputPath);
    try {
      await fs.mkdir(path.dirname(rollbackSvg), { recursive: true });
      await fs.copyFile(canonSvg, rollbackSvg);
      backedSvgs.push(entry.outputPath);
    } catch {
      /* new path */
    }
    await fs.mkdir(path.dirname(canonSvg), { recursive: true });
    await fs.copyFile(stagedSvg, canonSvg);
  }

  const serialized = JSON.stringify(manifest, null, 2);
  await fs.mkdir(path.dirname(assessmentPath), { recursive: true });
  await fs.writeFile(assessmentPath, serialized, "utf8");
  await fs.writeFile(legacyPath, serialized, "utf8");

  const verifyPath = path.join(rollbackRoot, "rollback-meta.json");
  await fs.writeFile(
    verifyPath,
    JSON.stringify(
      {
        stagingRunId,
        promotedAt: new Date().toISOString(),
        backedSvgCount: backedSvgs.length,
        canonicalManifest: assessmentManifestRelPath(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

/** Verify staged files exist and match manifest before promotion. */
export async function verifyStagingArtifacts(
  stagingRunId: string,
  manifest: BatchManifest,
): Promise<string[]> {
  const stagingRoot = getAssessmentStagingDir(stagingRunId);
  const missing: string[] = [];
  for (const entry of manifest.entries) {
    if (!entry.outputPath) {
      missing.push(`${entry.id}: empty outputPath`);
      continue;
    }
    const staged = path.join(stagingRoot, entry.outputPath);
    try {
      await fs.access(staged);
    } catch {
      missing.push(entry.outputPath);
    }
  }
  return missing;
}

export async function hashCanonicalAssessmentManifest(): Promise<string | null> {
  try {
    return await sha256File(getAssessmentManifestPath());
  } catch {
    return null;
  }
}
