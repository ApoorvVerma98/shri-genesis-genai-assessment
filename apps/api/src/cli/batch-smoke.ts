import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { createContentGenerator } from "@vector-forge/ai";
import fs from "node:fs/promises";
import path from "node:path";
import type { BatchSegment } from "@vector-forge/shared";
import { runBatch } from "../pipeline.js";
import { REPO_ROOT, resolveOutputDir } from "../paths.js";

/**
 * Small targeted AI batch (default 3 designs) for verifying rate limits and provenance.
 * Does not modify the assessment manifest.
 */
async function main() {
  const count = Number(process.argv[2] ?? 3);
  const gen = createContentGenerator();
  const status = gen.status();
  console.log("AI status:", {
    provider: status.provider,
    configured: status.configured,
    model: status.model,
    message: status.message,
  });

  const segments: BatchSegment[] = [];
  segments.push({ category: "technology", layoutFamily: "promotional-banner", count: 1 });
  segments.push({ category: "education", layoutFamily: "editorial-infographic", count: 1 });
  const third = Math.max(0, count - 2);
  if (third > 0) {
    segments.push({ category: "finance", layoutFamily: "metrics-dashboard", count: third });
  }

  const manifest = await runBatch({
    seed: 99,
    segments,
  });

  const ai = manifest.entries.filter((e) => e.contentMode === "ai").length;
  const fb = manifest.entries.filter((e) => e.contentMode === "fallback").length;
  const runId = manifest.batchRunId ?? "unknown";

  const smokeReport = {
    purpose: "P0 AI smoke batch — targeted run only",
    batchRunId: runId,
    manifestPath: path.join(resolveOutputDir(), "runs", runId, "manifest.json"),
    requested: manifest.requested,
    aiSuccess: ai,
    fallback: fb,
    aiAttempted: manifest.aiAttempted,
    aiFailedThenFallback: manifest.aiFailedThenFallback,
    entries: manifest.entries.map((e) => ({
      id: e.id,
      category: e.category,
      layoutFamily: e.layoutFamily,
      contentMode: e.contentMode,
      validationStatus: e.validationStatus,
      outputPath: e.outputPath,
      fallbackReason: e.fallbackReason?.slice(0, 120),
    })),
    completedAt: manifest.completedAt,
  };

  const out = path.join(REPO_ROOT, "reports", "ai-smoke-batch.json");
  await fs.writeFile(out, JSON.stringify(smokeReport, null, 2), "utf8");
  console.log(JSON.stringify(smokeReport, null, 2));
  console.log(`Smoke report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
