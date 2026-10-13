import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import {
  BatchManifestSchema,
  reconcileAssessmentManifest,
} from "@vector-forge/shared";
import { validateSvgStructure } from "@vector-forge/validation";
import fs from "node:fs/promises";
import path from "node:path";
import { getAssessmentManifestPath } from "../manifest-paths.js";
import { getLegacyManifestPath, REPO_ROOT, resolveOutputDir } from "../paths.js";

const BASELINE_PATH = path.join(REPO_ROOT, "reports", "baseline-phase1", "manifest.json");
const ARCHIVE_DIR = path.join(REPO_ROOT, "outputs-phase1-archive");

async function main() {
  const baselineRaw = await fs.readFile(BASELINE_PATH, "utf8");
  const baseline = BatchManifestSchema.parse(JSON.parse(baselineRaw));

  const result = await reconcileAssessmentManifest({
    baselineManifest: baseline,
    readSvg: async (relativeOutputPath) => {
      const primary = path.join(resolveOutputDir(), relativeOutputPath);
      try {
        const svg = await fs.readFile(primary, "utf8");
        return { svg, resolvedFrom: "outputs" };
      } catch {
        const archive = path.join(ARCHIVE_DIR, relativeOutputPath);
        try {
          const svg = await fs.readFile(archive, "utf8");
          return { svg, resolvedFrom: "archive" };
        } catch {
          return null;
        }
      }
    },
    validateEntry: (svg) => {
      const v = validateSvgStructure(svg);
      return {
        contentHash: v.contentHash,
        structureHash: v.structureHash,
        issues: v.passed ? [] : v.issues,
      };
    },
  });

  const assessmentPath = getAssessmentManifestPath();
  await fs.mkdir(path.dirname(assessmentPath), { recursive: true });
  const serialized = JSON.stringify(result.manifest, null, 2);
  await fs.writeFile(assessmentPath, serialized, "utf8");
  await fs.writeFile(getLegacyManifestPath(), serialized, "utf8");

  const reconcileReport = {
    completedAt: new Date().toISOString(),
    assessmentManifest: assessmentPath,
    stats: result.stats,
    contentModeCounts: {
      ai: result.manifest.entries.filter((e) => e.contentMode === "ai").length,
      fallback: result.manifest.entries.filter((e) => e.contentMode === "fallback").length,
      unknown: result.manifest.entries.filter((e) => e.contentMode === "unknown").length,
    },
  };
  const reportPath = path.join(REPO_ROOT, "reports", "assessment-reconcile.json");
  await fs.writeFile(reportPath, JSON.stringify(reconcileReport, null, 2), "utf8");

  console.log("Assessment manifest reconciled:", reconcileReport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
