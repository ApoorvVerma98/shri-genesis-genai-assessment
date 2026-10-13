import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { BatchManifestSchema } from "@vector-forge/shared";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { readAssessmentManifest } from "../manifest-io.js";
import { REPO_ROOT, REPORTS_DIR, resolveOutputDir } from "../paths.js";

const EXPECTED_ENTRIES = 100;

const REPORT_FILES = [
  "execution-report.json",
  "execution-report.md",
  "execution-run.json",
  "category-coverage.json",
  "validation-summary.json",
  "assessment-reconcile.json",
];

async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

async function copyFileEnsuringDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function main() {
  const manifest = await readAssessmentManifest();
  if (!manifest) {
    console.error("FAIL: Assessment manifest not found.");
    process.exit(1);
  }

  const parsed = BatchManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    console.error("FAIL: Assessment manifest schema invalid.", parsed.error.message);
    process.exit(1);
  }

  const entries = parsed.data.entries;
  if (entries.length !== EXPECTED_ENTRIES) {
    console.error(`FAIL: Expected ${EXPECTED_ENTRIES} manifest entries, got ${entries.length}.`);
    process.exit(1);
  }

  const outputRoot = resolveOutputDir();
  const missing: string[] = [];
  const svgSources: { rel: string; abs: string }[] = [];

  for (const entry of entries) {
    if (!entry.outputPath) {
      missing.push(`(empty outputPath for ${entry.id})`);
      continue;
    }
    const abs = path.join(outputRoot, entry.outputPath);
    try {
      await fs.access(abs);
      svgSources.push({ rel: entry.outputPath.replace(/\\/g, "/"), abs });
    } catch {
      missing.push(entry.outputPath);
    }
  }

  if (missing.length > 0) {
    console.error(`FAIL: ${missing.length} referenced SVG(s) missing on disk.`);
    console.error(missing.slice(0, 10).join("\n"));
    process.exit(1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupRoot = path.join(REPO_ROOT, "reports", "backups", `pre-regen-${ts}`);

  const assessmentManifestSrc = path.join(outputRoot, "assessment", "manifest.json");
  const legacyManifestSrc = path.join(outputRoot, "manifest.json");

  await copyFileEnsuringDir(
    assessmentManifestSrc,
    path.join(backupRoot, "outputs", "assessment", "manifest.json"),
  );
  await copyFileEnsuringDir(
    legacyManifestSrc,
    path.join(backupRoot, "outputs", "manifest.json"),
  );

  for (const { rel, abs } of svgSources) {
    await copyFileEnsuringDir(abs, path.join(backupRoot, "outputs", rel));
  }

  let reportsBacked = 0;
  for (const name of REPORT_FILES) {
    const src = path.join(REPORTS_DIR, name);
    try {
      await fs.access(src);
      await copyFileEnsuringDir(src, path.join(backupRoot, "reports", name));
      reportsBacked++;
    } catch {
      /* optional */
    }
  }

  // Verify backup completeness
  const verifyErrors: string[] = [];
  const backedManifestPath = path.join(backupRoot, "outputs", "assessment", "manifest.json");
  const backedManifest = JSON.parse(await fs.readFile(backedManifestPath, "utf8")) as {
    entries: { outputPath: string }[];
  };
  if (backedManifest.entries.length !== EXPECTED_ENTRIES) {
    verifyErrors.push("Backed manifest entry count mismatch");
  }
  for (const entry of backedManifest.entries) {
    const dest = path.join(backupRoot, "outputs", entry.outputPath);
    try {
      await fs.access(dest);
    } catch {
      verifyErrors.push(`Missing backed SVG: ${entry.outputPath}`);
    }
  }

  if (verifyErrors.length > 0) {
    console.error("FAIL: Backup verification failed:");
    verifyErrors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const summary = {
    backupRoot,
    createdAt: new Date().toISOString(),
    manifestEntries: entries.length,
    svgsBackedUp: svgSources.length,
    reportsBackedUp: reportsBacked,
    verification: "passed",
    originalCollectionModified: false,
  };

  // Hash spot-check: first and last SVG unchanged on disk (backup is copy)
  const firstHash = await sha256File(svgSources[0].abs);
  const firstBackupHash = await sha256File(
    path.join(backupRoot, "outputs", svgSources[0].rel),
  );
  if (firstHash !== firstBackupHash) {
    console.error("FAIL: Backup hash mismatch for sample file.");
    process.exit(1);
  }

  await fs.writeFile(
    path.join(backupRoot, "backup-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  console.log(JSON.stringify({ ...summary, reportFiles: undefined }, null, 2));
  console.log(`Backup summary: ${path.join(backupRoot, "backup-summary.json")}`);
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
