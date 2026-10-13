import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { BatchManifestSchema, buildManifestCoverageReport } from "@vector-forge/shared";
import { createContentGenerator } from "@vector-forge/ai";
import fs from "node:fs/promises";
import path from "node:path";
import { readAssessmentManifest } from "../manifest-io.js";
import { readExecutionRun } from "../execution-run.js";
import { REPO_ROOT, REPORTS_DIR } from "../paths.js";

/**
 * Writes execution-report.json and validation-summary fields from the canonical assessment manifest.
 * Does not invent AI metrics; reads optional ai-verify-batch.json for controlled test results.
 */
async function main() {
  const run = await readExecutionRun();
  if (run?.status === "in_progress") {
    console.error(
      "WARN: execution-run.json shows in_progress; sync output may not describe the latest batch.",
    );
  }

  const manifest = await readAssessmentManifest();
  if (!manifest) {
    console.error("No assessment manifest");
    process.exit(1);
  }
  const parsed = BatchManifestSchema.parse(manifest);
  const gen = createContentGenerator();

  let verify: Record<string, unknown> | undefined;
  try {
    verify = JSON.parse(
      await fs.readFile(path.join(REPORTS_DIR, "ai-verify-batch.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    /* optional */
  }

  const coverage = buildManifestCoverageReport(parsed, "assessment");

  const execution = {
    phase: "pre-full-regeneration",
    canonicalCollection: "outputs/assessment/manifest.json",
    assessment: {
      requested: parsed.requested,
      generated: parsed.generated,
      validationPassed: parsed.validationPassed,
      validationFailed: parsed.validationFailed,
      aiGenerated: parsed.aiGenerated ?? coverage.ai,
      fallbackGenerated: parsed.fallbackGenerated ?? coverage.fallback,
      unknownProvenance: coverage.unknown,
      aggregateProvenanceNote: parsed.aggregateProvenanceNote,
    },
    controlledAiVerification: verify ?? null,
    aiProvider: gen.status(),
    categoryCoverage: coverage.categories,
    layoutCoverage: coverage.layouts,
    knownLimitations: [
      "Assessment vf-NNNN per-entry AI/fallback may be unknown until full regeneration.",
      "Text wrapping is heuristic; overlap detection is not geometric.",
      "Visual QA is documented separately in reports/visual-qa-report.md",
    ],
    completedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(REPORTS_DIR, "execution-report.json"),
    JSON.stringify(execution, null, 2),
    "utf8",
  );

  const md = `# VectorForge — Execution Report (derived)

Generated: ${execution.completedAt}

## Canonical assessment collection

| Metric | Value |
|--------|------:|
| Designs | ${parsed.generated} |
| Validation passed | ${parsed.validationPassed} |
| AI (manifest) | ${coverage.ai} |
| Fallback | ${coverage.fallback} |
| Unknown provenance | ${coverage.unknown} |

${parsed.aggregateProvenanceNote ? `**Note:** ${parsed.aggregateProvenanceNote}\n` : ""}

## Controlled AI verification (targeted run)

${verify ? `- Batch run: ${verify.batchRunId}\n- AI success: ${verify.aiSuccess} / ${verify.requested} (${verify.aiRate}%)\n- Report: \`reports/ai-verify-batch.json\`` : "_No ai-verify-batch.json — run `npm run batch:verify`._"}

## Provider

- Provider: ${gen.status().provider}
- Configured: ${gen.status().configured}
- Model: ${gen.status().model ?? "n/a"}

## Next step

Full assessment regeneration: see \`reports/full-regeneration-workflow.md\` (requires approval).
`;

  await fs.writeFile(path.join(REPORTS_DIR, "execution-report.md"), md, "utf8");
  console.log("Synced reports/execution-report.json and execution-report.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
