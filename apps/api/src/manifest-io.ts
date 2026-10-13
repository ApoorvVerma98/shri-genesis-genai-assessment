import type { BatchManifest } from "@vector-forge/shared";
import fs from "node:fs/promises";
import path from "node:path";
import { getAssessmentManifestPath, getTargetedRunManifestPath } from "./manifest-paths.js";
import { getLegacyManifestPath } from "./paths.js";
import { resolveOutputDir } from "./paths.js";

export async function readAssessmentManifest(): Promise<BatchManifest | null> {
  try {
    const raw = await fs.readFile(getAssessmentManifestPath(), "utf8");
    return JSON.parse(raw) as BatchManifest;
  } catch {
    try {
      const raw = await fs.readFile(getLegacyManifestPath(), "utf8");
      return JSON.parse(raw) as BatchManifest;
    } catch {
      return null;
    }
  }
}

export async function readTargetedManifest(runId: string): Promise<BatchManifest | null> {
  try {
    const raw = await fs.readFile(getTargetedRunManifestPath(runId), "utf8");
    return JSON.parse(raw) as BatchManifest;
  } catch {
    return null;
  }
}

export async function listTargetedRunIds(): Promise<string[]> {
  const runsDir = path.join(resolveOutputDir(), "runs");
  try {
    const dirs = await fs.readdir(runsDir, { withFileTypes: true });
    const ids: string[] = [];
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const manifestPath = path.join(runsDir, d.name, "manifest.json");
      try {
        await fs.access(manifestPath);
        ids.push(d.name);
      } catch {
        /* skip */
      }
    }
    return ids.sort();
  } catch {
    return [];
  }
}
