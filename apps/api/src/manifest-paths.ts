import path from "node:path";
import {
  assessmentManifestRelPath,
  targetedRunManifestRelPath,
  type BatchCollection,
} from "@vector-forge/shared";
import { getLegacyManifestPath, resolveOutputDir } from "./paths.js";

export function getAssessmentManifestPath(): string {
  return path.join(resolveOutputDir(), assessmentManifestRelPath());
}

export function getTargetedRunManifestPath(batchRunId: string): string {
  return path.join(resolveOutputDir(), targetedRunManifestRelPath(batchRunId));
}

/** Legacy path: same content as assessment manifest after reconciliation. */
export { getLegacyManifestPath };

export function resolveManifestWritePath(
  collection: BatchCollection,
  batchRunId: string,
): string {
  if (collection === "targeted") return getTargetedRunManifestPath(batchRunId);
  return getAssessmentManifestPath();
}
