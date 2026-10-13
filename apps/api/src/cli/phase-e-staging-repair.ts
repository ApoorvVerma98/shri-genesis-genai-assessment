import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { buildTopicPlan } from "@vector-forge/shared";
import type { BatchManifest, ManifestEntry } from "@vector-forge/shared";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  getAssessmentStagingDir,
  getStagingManifestPath,
  verifyStagingArtifacts,
} from "../assessment-staging.js";
import {
  assertAssessmentBatchForPromotion,
  validateAssessmentBatchForPromotion,
} from "../batch-gates.js";
import { generateOne } from "../pipeline.js";
import { REPO_ROOT, resolveOutputDir } from "../paths.js";
import {
  detectSvgTextTruncation,
  hashContent,
  validateSvgStructure,
} from "@vector-forge/validation";

const RUN_ID = "500ef818-1745-4211-bc10-53ac24d2fe45";
const REPAIR_IDS = ["vf-0055", "vf-0091"] as const;
const SEED = 42;
const PRE_REGEN_BACKUP = path.join(
  REPO_ROOT,
  "reports",
  "backups",
  "pre-regen-2026-10-13T07-05-06",
  "outputs",
);

async function sha256File(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

async function hashAllStagedSvgs(
  stagingRoot: string,
  entries: ManifestEntry[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const e of entries) {
    if (!e.outputPath) continue;
    const p = path.join(stagingRoot, e.outputPath);
    map.set(e.id, await sha256File(p));
  }
  return map;
}

function recomputeManifestAggregates(
  manifest: BatchManifest,
  entries: ManifestEntry[],
): BatchManifest {
  const generated = entries.filter((e) => e.outputPath?.trim()).length;
  const validationPassed = entries.filter((e) => e.validationStatus === "passed").length;
  const validationFailed = entries.filter((e) => e.validationStatus !== "passed").length;
  const failed = entries.filter((e) => e.error && !e.outputPath?.trim()).length;
  const aiGenerated = entries.filter((e) => e.contentMode === "ai").length;
  const fallbackGenerated = entries.filter((e) => e.contentMode === "fallback").length;
  const aiAttempted = entries.filter((e) => e.aiAttempted).length;
  const aiFailedThenFallback = entries.filter(
    (e) => e.aiAttempted && e.contentMode === "fallback",
  ).length;

  return {
    ...manifest,
    entries,
    generated,
    attempted: entries.length,
    validationPassed,
    validationFailed,
    failed,
    aiGenerated,
    fallbackGenerated,
    aiAttempted,
    aiFailedThenFallback,
    completedAt: new Date().toISOString(),
  };
}

async function verifyEntryPipeline(
  stagingRoot: string,
  entry: ManifestEntry,
): Promise<{
  id: string;
  checks: Record<string, boolean | string | string[]>;
}> {
  const fullPath = path.join(stagingRoot, entry.outputPath);
  const svg = await fs.readFile(fullPath, "utf8");
  const structural = validateSvgStructure(svg);
  const visual = detectSvgTextTruncation(svg);
  const fileHash = hashContent(svg);
  const hashMatch = entry.contentHash === fileHash;
  return {
    id: entry.id,
    checks: {
      validationStatusPassed: entry.validationStatus === "passed",
      validationIssuesEmpty: entry.validationIssues.length === 0,
      structuralPassed: structural.passed,
      noTruncation: visual.length === 0,
      contentHashMatchesFile: hashMatch,
      fileContentHash: fileHash,
      manifestContentHash: entry.contentHash ?? "",
    },
  };
}

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(
    REPO_ROOT,
    "reports",
    "repair-backups",
    `phase-e-${RUN_ID}-${ts}`,
  );
  const stagingRoot = getAssessmentStagingDir(RUN_ID);
  const manifestPath = getStagingManifestPath(RUN_ID);

  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifestBefore = JSON.parse(manifestRaw) as BatchManifest;
  const manifestHashBefore = createHash("sha256").update(manifestRaw).digest("hex");

  await fs.mkdir(backupRoot, { recursive: true });
  await fs.copyFile(manifestPath, path.join(backupRoot, "manifest.json"));
  for (const id of REPAIR_IDS) {
    const entry = manifestBefore.entries.find((e) => e.id === id);
    if (!entry?.outputPath) throw new Error(`Missing staged entry ${id}`);
    const src = path.join(stagingRoot, entry.outputPath);
    const destDir = path.join(backupRoot, path.dirname(entry.outputPath));
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(src, path.join(backupRoot, entry.outputPath));
  }

  const svgHashesBefore = await hashAllStagedSvgs(stagingRoot, manifestBefore.entries);

  const plan = buildTopicPlan(100, SEED);
  const repairedEntries: ManifestEntry[] = [];
  for (const id of REPAIR_IDS) {
    const idx = plan.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error(`Plan missing ${id}`);
    const { entry } = await generateOne(plan[idx], idx, { outputRoot: stagingRoot });
    if (entry.id !== id) throw new Error(`ID mismatch for ${id}`);
    if (entry.topic !== plan[idx].topic) throw new Error(`Topic mismatch for ${id}`);
    repairedEntries.push(entry);
  }

  const entries = manifestBefore.entries.map((e) => {
    const rep = repairedEntries.find((r) => r.id === e.id);
    return rep ?? e;
  });

  const manifestAfter = recomputeManifestAggregates(
    { ...manifestBefore, collection: manifestBefore.collection ?? "assessment" },
    entries,
  );

  const manifestSerialized = JSON.stringify(manifestAfter, null, 2);
  await fs.writeFile(manifestPath, manifestSerialized, "utf8");
  const manifestHashAfter = createHash("sha256").update(manifestSerialized).digest("hex");

  const svgHashesAfter = await hashAllStagedSvgs(stagingRoot, manifestAfter.entries);
  const unchanged98: { id: string; unchanged: boolean; before: string; after: string }[] = [];
  for (const [id, beforeHash] of svgHashesBefore) {
    if (REPAIR_IDS.includes(id as (typeof REPAIR_IDS)[number])) continue;
    const afterHash = svgHashesAfter.get(id) ?? "";
    unchanged98.push({
      id,
      unchanged: beforeHash === afterHash,
      before: beforeHash,
      after: afterHash,
    });
  }
  const unchanged98Failures = unchanged98.filter((r) => !r.unchanged);

  const perEntryValidation = await Promise.all(
    manifestAfter.entries.map((e) => verifyEntryPipeline(stagingRoot, e)),
  );

  const missingArtifacts = await verifyStagingArtifacts(RUN_ID, manifestAfter);
  const promotionGate = validateAssessmentBatchForPromotion(manifestAfter);
  let promotionAssertOk = false;
  let promotionAssertError: string | undefined;
  try {
    assertAssessmentBatchForPromotion(manifestAfter);
    promotionAssertOk = true;
  } catch (e) {
    promotionAssertError = e instanceof Error ? e.message : String(e);
  }

  const canonicalManifestPath = path.join(resolveOutputDir(), "assessment", "manifest.json");
  const canonicalManifestHash = await sha256File(canonicalManifestPath);
  const backupManifestPath = path.join(PRE_REGEN_BACKUP, "assessment", "manifest.json");
  const backupManifestHash = await sha256File(backupManifestPath);

  let canonicalSvgDiffs = 0;
  const canonManifest = JSON.parse(
    await fs.readFile(canonicalManifestPath, "utf8"),
  ) as BatchManifest;
  for (const e of canonManifest.entries) {
    const cur = path.join(resolveOutputDir(), e.outputPath);
    const bak = path.join(PRE_REGEN_BACKUP, e.outputPath);
    const hc = await sha256File(cur);
    const hb = await sha256File(bak);
    if (hc !== hb) canonicalSvgDiffs++;
  }

  const outcome = {
    parentRunId: RUN_ID,
    parentOutcome: "promotion_blocked_validation_original",
    repairCompletedAt: new Date().toISOString(),
    repairBackupPath: backupRoot,
    repairedIds: [...REPAIR_IDS],
    layoutFix: "editorial-tile-fit (packages/svg-engine/src/layouts/editorial-tile-fit.ts)",
    manifest: {
      path: manifestPath,
      sha256Before: manifestHashBefore,
      sha256After: manifestHashAfter,
    },
    repairedSvgs: repairedEntries.map((e) => ({
      id: e.id,
      outputPath: e.outputPath,
      absolutePath: path.join(stagingRoot, e.outputPath),
      contentHash: e.contentHash,
      structureHash: e.structureHash,
      validationStatus: e.validationStatus,
      validationIssues: e.validationIssues,
      contentMode: e.contentMode,
      aiProvider: e.aiProvider,
      aiModel: e.aiModel,
      aiAttempted: e.aiAttempted,
      fallbackReason: e.fallbackReason,
      topic: e.topic,
      category: e.category,
      layoutFamily: e.layoutFamily,
      headline: e.headline,
    })),
    provenanceTotals: {
      aiGenerated: manifestAfter.aiGenerated,
      fallbackGenerated: manifestAfter.fallbackGenerated,
      aiAttempted: manifestAfter.aiAttempted,
      aiFailedThenFallback: manifestAfter.aiFailedThenFallback,
      validationPassed: manifestAfter.validationPassed,
      validationFailed: manifestAfter.validationFailed,
      failed: manifestAfter.failed,
      generated: manifestAfter.generated,
      requested: manifestAfter.requested,
      attempted: manifestAfter.attempted,
    },
    allEntriesValidation: perEntryValidation,
    unchanged98Check: {
      total: unchanged98.length,
      failures: unchanged98Failures,
      allUnchanged: unchanged98Failures.length === 0,
    },
    stagingArtifactVerification: {
      missingPaths: missingArtifacts,
      passed: missingArtifacts.length === 0,
    },
    promotionGate: {
      ok: promotionGate.ok,
      errors: promotionGate.errors,
      assertOk: promotionAssertOk,
      assertError: promotionAssertError,
    },
    canonicalIntegrity: {
      manifestSha256: canonicalManifestHash,
      backupManifestSha256: backupManifestHash,
      manifestMatchesPrePhaseEBackup: canonicalManifestHash === backupManifestHash,
      expectedCanonicalManifestSha256: "a1d4ddad256147fd7eac6f95c9bd51f955f1900555d9912a0b1b10ed60a45901",
      svgDiffCountVsBackup: canonicalSvgDiffs,
      allCanonicalSvgsMatchBackup: canonicalSvgDiffs === 0,
    },
    promotionExecuted: false,
    note:
      "execution-run.json and batch-progress.json unchanged — original failed promotion preserved.",
  };

  const outcomePath = path.join(REPO_ROOT, "reports", "phase-e-repair-outcome.json");
  await fs.writeFile(outcomePath, JSON.stringify(outcome, null, 2), "utf8");
  console.log(JSON.stringify(outcome, null, 2));

  if (
    !promotionAssertOk ||
    unchanged98Failures.length > 0 ||
    canonicalSvgDiffs > 0 ||
    canonicalManifestHash !== backupManifestHash
  ) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
