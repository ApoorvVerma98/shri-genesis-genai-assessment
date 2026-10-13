import { assessmentManifestRelPath } from "@vector-forge/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../../..");
export const REPORTS_DIR = path.join(REPO_ROOT, "reports");

export const ASSESSMENT_MANIFEST_REL = assessmentManifestRelPath();

export function resolveOutputDir(): string {
  const raw = process.env.OUTPUT_DIR?.trim();
  if (!raw) return path.join(REPO_ROOT, "outputs");
  if (path.isAbsolute(raw)) return raw;
  return path.join(REPO_ROOT, raw);
}

export function getManifestPath(): string {
  return path.join(resolveOutputDir(), ASSESSMENT_MANIFEST_REL);
}

export function getLegacyManifestPath(): string {
  return path.join(resolveOutputDir(), "manifest.json");
}

/** @deprecated Use getManifestPath() — resolved once at module load for older imports. */
export const OUTPUT_DIR = resolveOutputDir();
/** @deprecated Use getManifestPath(). */
export const MANIFEST_PATH = getManifestPath();
/** @deprecated Use getLegacyManifestPath(). */
export const LEGACY_MANIFEST_PATH = getLegacyManifestPath();

export function safeOutputPath(category: string, filename: string, outputRoot?: string): string {
  const safeCat = category.replace(/[^a-z0-9-]/gi, "");
  const safeName = filename.replace(/[^a-z0-9._-]/gi, "");
  const root = outputRoot ?? resolveOutputDir();
  return path.join(root, safeCat, safeName);
}

export function resolvePublicPath(relative: string): string | null {
  if (!relative || relative.includes("..")) return null;
  const base = path.resolve(resolveOutputDir());
  const full = path.resolve(base, relative);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}
