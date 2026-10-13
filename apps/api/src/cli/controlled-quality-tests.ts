import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { createContentGenerator } from "@vector-forge/ai";
import type { TopicSeed } from "@vector-forge/shared";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { generateOne } from "../pipeline.js";
import { getManifestPath, REPO_ROOT, resolveOutputDir } from "../paths.js";
import { detectSvgTextTruncation, validateSvgStructure } from "@vector-forge/validation";

async function hashFile(filePath: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(filePath);
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

async function runOne(seed: TopicSeed) {
  const { entry } = await generateOne(seed, 0);
  const full = path.join(resolveOutputDir(), entry.outputPath);
  const svg = await fs.readFile(full, "utf8");
  const structural = validateSvgStructure(svg);
  const visual = detectSvgTextTruncation(svg);
  return {
    id: entry.id,
    category: entry.category,
    layoutFamily: entry.layoutFamily,
    topic: entry.topic,
    aiAttempted: entry.aiAttempted,
    contentMode: entry.contentMode,
    fallbackReason: entry.fallbackReason,
    validationStatus: entry.validationStatus,
    validationIssues: entry.validationIssues,
    structuralPassed: structural.passed,
    visualIssues: visual,
    outputPath: entry.outputPath,
    hasEllipsis: svg.includes("…"),
  };
}

/**
 * Controlled QA: promotional banner with long copy + comparison layout.
 * Writes one-off SVGs only — does not update assessment manifest.
 */
async function main() {
  const assessmentPath = getManifestPath();
  const beforeHash = await hashFile(assessmentPath);
  const gen = createContentGenerator();
  const ts = Date.now().toString(36);

  const longTopic =
    "Enterprise edge AI platforms for resilient smart-factory automation with zero-latency quality control";

  const bannerSeed: TopicSeed = {
    id: `vf-qa-${ts}-banner`,
    category: "technology",
    topic: longTopic,
    layoutFamily: "promotional-banner",
    designType: "banner",
    tone: "bold",
    targetAudience: "plant operations leaders",
  };

  const comparisonSeed: TopicSeed = {
    id: `vf-qa-${ts}-compare`,
    category: "business",
    topic: "Customer success playbooks that scale across global teams",
    layoutFamily: "comparison",
    designType: "infographic",
    tone: "professional",
    targetAudience: "customer success leaders",
  };

  const designs = [await runOne(bannerSeed), await runOne(comparisonSeed)];
  const afterHash = await hashFile(assessmentPath);

  const report = {
    purpose: "Phase 5 — controlled quality tests (long banner + comparison)",
    runAt: new Date().toISOString(),
    aiProvider: gen.status().provider,
    aiConfigured: gen.status().configured,
    assessmentManifest: {
      path: assessmentPath,
      sha256Before: beforeHash,
      sha256After: afterHash,
      unchanged: beforeHash !== null && beforeHash === afterHash,
    },
    designs,
  };

  const out = path.join(REPO_ROOT, "reports", "controlled-quality-tests.json");
  await fs.writeFile(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (!report.assessmentManifest.unchanged) {
    console.error("Assessment manifest changed.");
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
