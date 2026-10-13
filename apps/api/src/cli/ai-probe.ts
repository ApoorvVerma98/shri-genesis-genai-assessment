import { createContentGenerator } from "@vector-forge/ai";
import { buildTopicPlan } from "@vector-forge/shared";
import { bootstrapEnv, getEnvBootstrapDiagnostics } from "../config/bootstrap-env.js";
import { generateOne } from "../pipeline.js";

bootstrapEnv();

async function main() {
  const gen = createContentGenerator();
  const status = await gen.probe();
  console.log("Env:", getEnvBootstrapDiagnostics());
  console.log("Provider status:", {
    provider: status.provider,
    configured: status.configured,
    model: status.model,
    reachable: status.reachable,
    message: status.message,
  });

  if (status.provider === "fallback") {
    console.error(
      "AI_PROVIDER is fallback or unset after loading root .env. Set AI_PROVIDER in the repository root .env.",
    );
    process.exit(2);
  }

  if (!status.configured) {
    console.error(status.message);
    process.exit(2);
  }

  if (status.reachable === false) {
    console.error(`Provider not reachable: ${status.message}`);
    process.exit(3);
  }

  const seed = buildTopicPlan(1, 99)[0];
  seed.id = `ai-probe-${Date.now()}`;
  seed.layoutFamily = "editorial-infographic";
  const { entry } = await generateOne(seed, 0);
  console.log("Probe entry:", {
    id: entry.id,
    contentMode: entry.contentMode,
    aiProvider: entry.aiProvider,
    aiModel: entry.aiModel,
    aiAttempted: entry.aiAttempted,
    fallbackReason: entry.fallbackReason,
    validationStatus: entry.validationStatus,
    headline: entry.headline,
  });

  if (entry.contentMode !== "ai") {
    console.error("Probe did not produce AI content.");
    process.exit(4);
  }
  console.log("AI probe succeeded.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
