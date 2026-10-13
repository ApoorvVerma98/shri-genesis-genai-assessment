import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { buildTopicPlan } from "@vector-forge/shared";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { generateOne } from "../pipeline.js";
import { REPO_ROOT, resolveOutputDir } from "../paths.js";
import { detectSvgTextTruncation, validateSvgStructure } from "@vector-forge/validation";

const STAGING_RUN = "500ef818-1745-4211-bc10-53ac24d2fe45";
const TARGET_IDS = ["vf-0055", "vf-0091"] as const;
const SEED = 42;
const DIAG_ROOT = path.join(REPO_ROOT, "outputs", "diagnostic", "phase-e-truncation-fix");

async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const plan = buildTopicPlan(100, SEED);
  const stagingRoot = path.join(REPO_ROOT, "outputs", "staging", STAGING_RUN);
  const stagingSpot = path.join(stagingRoot, "cybersecurity", "vf-0056.svg");
  const stagingSpotHashBefore = await sha256File(stagingSpot);

  const mapping: Record<string, { planIndex: number; topic: string; category: string }> = {};
  for (const id of TARGET_IDS) {
    const idx = plan.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error(`Topic plan missing ${id}`);
    mapping[id] = {
      planIndex: idx,
      topic: plan[idx].topic,
      category: plan[idx].category,
    };
  }

  await fs.mkdir(DIAG_ROOT, { recursive: true });

  const results = [];
  for (const id of TARGET_IDS) {
    const idx = mapping[id].planIndex;
    const seed = plan[idx];
    if (seed.id !== id || seed.topic !== mapping[id].topic) {
      throw new Error(`Topic plan mapping mismatch for ${id}`);
    }
    const { entry, svg } = await generateOne(seed, idx, { outputRoot: DIAG_ROOT });
    const structural = validateSvgStructure(svg);
    const visual = detectSvgTextTruncation(svg);
    const fullPath = path.join(DIAG_ROOT, entry.outputPath);
    const fileHash = await sha256File(fullPath);

    results.push({
      id,
      planIndex: idx,
      topic: seed.topic,
      category: seed.category,
      layoutFamily: seed.layoutFamily,
      outputPath: entry.outputPath,
      absolutePath: fullPath,
      contentMode: entry.contentMode,
      validationStatus: entry.validationStatus,
      validationIssues: entry.validationIssues,
      structuralPassed: structural.passed,
      visualIssues: visual,
      hasEllipsis: svg.includes("…"),
      contentHash: fileHash,
      manifestContentHash: entry.contentHash,
      headline: entry.headline,
    });
  }

  const stagingSpotHashAfter = await sha256File(stagingSpot);
  const canonicalManifestHash = await sha256File(
    path.join(resolveOutputDir(), "assessment", "manifest.json"),
  );

  const report = {
    purpose: "Phase E truncation repair diagnostic (vf-0055, vf-0091 only)",
    runAt: new Date().toISOString(),
    topicPlanSeed: SEED,
    topicPlanMapping: mapping,
    diagnosticOutputRoot: DIAG_ROOT,
    stagingRunId: STAGING_RUN,
    stagingUntouched: {
      spotCheckFile: stagingSpot,
      sha256Before: stagingSpotHashBefore,
      sha256After: stagingSpotHashAfter,
      unchanged: stagingSpotHashBefore === stagingSpotHashAfter,
    },
    canonicalManifestSha256: canonicalManifestHash,
    designs: results,
  };

  const reportPath = path.join(DIAG_ROOT, "diagnostic-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  const allPassed = results.every(
    (r) =>
      r.validationStatus === "passed" &&
      !r.hasEllipsis &&
      r.visualIssues.length === 0,
  );
  if (!allPassed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
