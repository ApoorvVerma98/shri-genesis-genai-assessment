import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { BatchManifestSchema, buildManifestCoverageReport } from "@vector-forge/shared";
import fs from "node:fs/promises";
import path from "node:path";
import { readAssessmentManifest } from "../manifest-io.js";
import { REPO_ROOT } from "../paths.js";

async function main() {
  const manifest = await readAssessmentManifest();
  if (!manifest) {
    console.error("Assessment manifest not found");
    process.exit(1);
  }
  const parsed = BatchManifestSchema.parse(manifest);
  const report = buildManifestCoverageReport(parsed, "assessment");
  const out = path.join(REPO_ROOT, "reports", "category-coverage.json");
  await fs.writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
