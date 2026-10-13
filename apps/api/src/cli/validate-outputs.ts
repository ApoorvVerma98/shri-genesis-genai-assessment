import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import type { ManifestEntry } from "@vector-forge/shared";
import {
  detectHeadlineRepetition,
  detectNearDuplicateBriefs,
  findExactDuplicates,
  validateSvgStructure,
} from "@vector-forge/validation";
import fs from "node:fs/promises";
import path from "node:path";
import { getManifestPath, REPORTS_DIR, resolveOutputDir } from "../paths.js";

async function main() {
  const raw = await fs.readFile(getManifestPath(), "utf8");
  const manifest = JSON.parse(raw) as { entries: ManifestEntry[] };
  let passed = 0;
  let failed = 0;
  const hashes: string[] = [];
  const nearInput: { structureHash?: string; headline?: string; layoutFamily: string }[] = [];
  const headlines: string[] = [];

  for (const entry of manifest.entries) {
    if (!entry.outputPath) {
      failed++;
      continue;
    }
    const full = path.join(resolveOutputDir(), entry.outputPath);
    const svg = await fs.readFile(full, "utf8");
    const v = validateSvgStructure(svg);
    if (v.passed) passed++;
    else failed++;
    if (v.contentHash) hashes.push(v.contentHash);
    nearInput.push({
      structureHash: v.structureHash,
      headline: entry.headline ?? entry.topic,
      layoutFamily: entry.layoutFamily,
    });
    headlines.push(entry.headline ?? entry.topic);
  }

  const dups = findExactDuplicates(hashes);
  const near = detectNearDuplicateBriefs(nearInput);
  const headlineDups = detectHeadlineRepetition(headlines);
  const out = {
    passed,
    failed,
    exactDuplicateGroups: dups.size,
    nearDuplicatePairs: near.length,
    duplicateHeadlineGroups: headlineDups.size,
  };
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORTS_DIR, "validation-summary.json"), JSON.stringify(out, null, 2));
  console.log(out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
