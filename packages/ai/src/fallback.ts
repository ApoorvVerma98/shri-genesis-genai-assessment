import type { GenerationBrief, LayoutFamily } from "@vector-forge/shared";
import type { TopicSeed } from "@vector-forge/shared";
import {
  buildFallbackHeadline,
  buildFallbackSubtitle,
  categoryComparison,
  categoryKeyPoints,
  categoryMetrics,
  categorySteps,
} from "./fallback-content.js";

function layoutExtras(seed: TopicSeed): Partial<GenerationBrief> {
  switch (seed.layoutFamily) {
    case "metrics-dashboard":
      return { metrics: categoryMetrics(seed) };
    case "step-by-step":
      return { steps: categorySteps(seed) };
    case "comparison":
      return { comparison: categoryComparison(seed) };
    case "quote-banner":
      return {
        quote: {
          text: `${seed.topic} works when teams make ${seed.tone} choices visible to ${seed.targetAudience}.`,
          attribution: `${seed.category} practice lead`,
        },
      };
    case "feature-grid":
    case "list-announcement":
    case "editorial-infographic":
      return { keyPoints: categoryKeyPoints(seed) };
    case "promotional-banner":
      return {
        supportingText: `Start with ${seed.topic.toLowerCase()} — built for ${seed.targetAudience}.`,
      };
    default:
      return {
        supportingText: `A concise briefing on ${seed.topic} for ${seed.targetAudience}.`,
      };
  }
}

export function generateFallbackBrief(seed: TopicSeed): {
  partial: Omit<GenerationBrief, "id" | "canvas"> & { canvas?: GenerationBrief["canvas"] };
  mode: "fallback";
} {
  return {
    mode: "fallback",
    partial: {
      category: seed.category,
      topic: seed.topic,
      designType: seed.designType,
      tone: seed.tone,
      targetAudience: seed.targetAudience,
      layoutFamily: seed.layoutFamily as LayoutFamily,
      headline: buildFallbackHeadline(seed),
      subtitle: buildFallbackSubtitle(seed),
      supportingText: `Original structured copy for ${seed.category}: ${seed.topic}. Illustrative metrics are labeled when used.`,
      visualMotifs: [seed.category, seed.layoutFamily],
      layoutRecommendation: `${seed.layoutFamily} fits ${seed.designType} content for this topic.`,
      styleDirection: seed.tone,
      ...layoutExtras(seed),
    },
  };
}
