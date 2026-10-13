import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import type { BatchSegment } from "@vector-forge/shared";
import { createContentGenerator } from "@vector-forge/ai";
import fs from "node:fs/promises";
import path from "node:path";
import { runBatch } from "../pipeline.js";
import { REPO_ROOT, resolveOutputDir } from "../paths.js";

/** Controlled 8-design verification across categories/layouts (targeted run only). */
const VERIFY_SEGMENTS: BatchSegment[] = [
  { category: "technology", layoutFamily: "promotional-banner", count: 1 },
  { category: "education", layoutFamily: "editorial-infographic", count: 1 },
  { category: "finance", layoutFamily: "metrics-dashboard", count: 1 },
  { category: "healthcare", layoutFamily: "quote-banner", count: 1 },
  { category: "marketing", layoutFamily: "comparison", count: 1 },
  { category: "cybersecurity", layoutFamily: "step-by-step", count: 1 },
  { category: "sustainability", layoutFamily: "feature-grid", count: 1 },
  { category: "business", layoutFamily: "list-announcement", count: 1 },
];

async function main() {
  const gen = createContentGenerator();
  const status = gen.status();
  console.log("AI status:", {
    provider: status.provider,
    configured: status.configured,
    model: status.model,
  });

  const manifest = await runBatch({ seed: 77, segments: VERIFY_SEGMENTS });

  const ai = manifest.entries.filter((e) => e.contentMode === "ai").length;
  const fb = manifest.entries.filter((e) => e.contentMode === "fallback").length;
  const runId = manifest.batchRunId ?? "unknown";

  const report = {
    phase: "C-controlled-verification",
    purpose: "8-design multi category/layout AI pipeline verification",
    batchRunId: runId,
    manifestPath: path.join(resolveOutputDir(), "runs", runId, "manifest.json"),
    requested: manifest.requested,
    aiSuccess: ai,
    fallback: fb,
    aiRate: manifest.requested ? Math.round((ai / manifest.requested) * 100) : 0,
    aiAttempted: manifest.aiAttempted,
    aiFailedThenFallback: manifest.aiFailedThenFallback,
    entries: manifest.entries.map((e) => ({
      id: e.id,
      category: e.category,
      layoutFamily: e.layoutFamily,
      topic: e.topic,
      headline: e.headline,
      contentMode: e.contentMode,
      validationStatus: e.validationStatus,
      outputPath: e.outputPath,
      fallbackReason: e.fallbackReason?.slice(0, 160),
    })),
    completedAt: manifest.completedAt,
  };

  const out = path.join(REPO_ROOT, "reports", "ai-verify-batch.json");
  await fs.writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
