import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { buildSingleDesignSeed } from "@vector-forge/shared";
import fs from "node:fs/promises";
import path from "node:path";
import { generateOne } from "../pipeline.js";
import { REPO_ROOT } from "../paths.js";
import { detectSvgTextTruncation, validateSvgStructure } from "@vector-forge/validation";

const CASES = [
  {
    label: "A-healthcare-quote",
    category: "healthcare" as const,
    layoutFamily: "quote-banner" as const,
    topic: "Encourage patients to follow prescribed medication schedules.",
  },
  {
    label: "B-real-estate-steps",
    category: "real-estate" as const,
    layoutFamily: "step-by-step" as const,
    topic: "Explain the steps first-time buyers should take before purchasing a home.",
  },
  {
    label: "C-ecommerce-metrics",
    category: "ecommerce" as const,
    layoutFamily: "metrics-dashboard" as const,
    topic: "Show store owners which operational metrics help them monitor checkout performance.",
  },
];

async function main() {
  const outRoot = path.join(REPO_ROOT, "outputs", "diagnostic", "smoke-single-relevance");
  await fs.mkdir(outRoot, { recursive: true });
  const results = [];

  for (const c of CASES) {
    const seed = buildSingleDesignSeed(
      { category: c.category, layoutFamily: c.layoutFamily, topic: c.topic },
      `smoke-${c.label}`,
    );
    const { entry, svg } = await generateOne(seed, 0, { outputRoot: outRoot });
    const structural = validateSvgStructure(svg);
    const truncation = detectSvgTextTruncation(svg);
    const outFile = path.join(outRoot, entry.outputPath);
    results.push({
      case: c.label,
      seed: { category: seed.category, layoutFamily: seed.layoutFamily, topic: seed.topic },
      contentMode: entry.contentMode,
      aiAttempted: entry.aiAttempted,
      fallbackReason: entry.fallbackReason,
      validationStatus: entry.validationStatus,
      validationIssues: entry.validationIssues,
      headline: entry.headline,
      outputPath: entry.outputPath,
      absolutePath: outFile,
      structuralPassed: structural.passed,
      truncationIssues: truncation,
      svgSnippet: svg.replace(/\s+/g, " ").slice(0, 400),
    });
  }

  const reportPath = path.join(outRoot, "smoke-report.json");
  await fs.writeFile(reportPath, JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));
  console.log(JSON.stringify({ reportPath, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
