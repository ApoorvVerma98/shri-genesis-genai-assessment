import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { createContentGenerator } from "@vector-forge/ai";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { runBatch } from "../pipeline.js";
import { getManifestPath, REPO_ROOT, resolveOutputDir } from "../paths.js";

async function hashFile(filePath: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(filePath);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

/**
 * Two-design targeted run with assessment manifest integrity check.
 * Does not modify outputs/assessment/manifest.json.
 */
async function main() {
  const assessmentPath = getManifestPath();
  const beforeHash = await hashFile(assessmentPath);
  const beforeStat = await fs.stat(assessmentPath).catch(() => null);

  const gen = createContentGenerator();
  const aiStatus = gen.status();

  const manifest = await runBatch({
    seed: 4242,
    segments: [
      { category: "technology", layoutFamily: "promotional-banner", count: 1 },
      { category: "finance", layoutFamily: "metrics-dashboard", count: 1 },
    ],
  });

  const afterHash = await hashFile(assessmentPath);
  const afterStat = await fs.stat(assessmentPath).catch(() => null);

  const runId = manifest.batchRunId ?? "unknown";
  const targetedManifestPath = path.join(resolveOutputDir(), "runs", runId, "manifest.json");

  const report = {
    purpose: "Phase E preflight — controlled targeted generation (2 designs)",
    runAt: new Date().toISOString(),
    aiProvider: aiStatus.provider,
    aiConfigured: aiStatus.configured,
    aiModel: aiStatus.model,
    assessmentManifest: {
      path: assessmentPath,
      sha256Before: beforeHash,
      sha256After: afterHash,
      unchanged: beforeHash !== null && beforeHash === afterHash,
      mtimeBefore: beforeStat?.mtime.toISOString(),
      mtimeAfter: afterStat?.mtime.toISOString(),
    },
    targetedRun: {
      batchRunId: runId,
      manifestPath: targetedManifestPath,
      requested: manifest.requested,
    },
    designs: manifest.entries.map((e) => ({
      id: e.id,
      category: e.category,
      layoutFamily: e.layoutFamily,
      aiAttempted: e.aiAttempted,
      contentMode: e.contentMode,
      fallbackReason: e.fallbackReason,
      validationStatus: e.validationStatus,
      validationIssues: e.validationIssues?.slice(0, 5),
      outputPath: e.outputPath,
      error: e.error,
    })),
  };

  const out = path.join(REPO_ROOT, "reports", "controlled-targeted-tests.json");
  await fs.writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report: ${out}`);

  if (!report.assessmentManifest.unchanged) {
    console.error("Assessment manifest changed — aborting.");
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
