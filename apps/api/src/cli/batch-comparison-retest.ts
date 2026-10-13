import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { createContentGenerator } from "@vector-forge/ai";
import fs from "node:fs/promises";
import path from "node:path";
import { runBatch } from "../pipeline.js";
import { REPO_ROOT } from "../paths.js";

/** Preflight: 2× comparison layout targeted run (does not touch assessment manifest). */
async function main() {
  const gen = createContentGenerator();
  const status = gen.status();
  console.log(
    JSON.stringify({
      provider: status.provider,
      configured: status.configured,
      model: status.model,
    }),
  );

  const manifest = await runBatch({
    seed: 881,
    segments: [{ category: "marketing", layoutFamily: "comparison", count: 2 }],
  });

  const rows = manifest.entries.map((e) => ({
    id: e.id,
    contentMode: e.contentMode,
    aiAttempted: e.aiAttempted,
    headline: e.headline,
    hasComparisonBrief: e.layoutFamily === "comparison",
    fallbackReason: e.fallbackReason?.slice(0, 200),
  }));

  const ai = manifest.entries.filter((e) => e.contentMode === "ai").length;
  const report = {
    purpose: "comparison-layout-preflight-retest",
    batchRunId: manifest.batchRunId,
    aiSuccess: ai,
    total: manifest.entries.length,
    entries: rows,
    completedAt: manifest.completedAt,
  };

  const out = path.join(REPO_ROOT, "reports", "comparison-layout-retest.json");
  await fs.writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  process.exit(ai === manifest.entries.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
