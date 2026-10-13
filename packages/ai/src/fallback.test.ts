import { GenerationBriefSchema } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import { generateFallbackBrief } from "./fallback.js";

describe("fallback content", () => {
  it("produces valid briefs", () => {
    const { partial } = generateFallbackBrief({
      id: "x",
      category: "finance",
      topic: "Cash flow basics",
      layoutFamily: "step-by-step",
      designType: "infographic",
      tone: "calm",
      targetAudience: "owners",
    });
    const brief = GenerationBriefSchema.parse({
      id: "x",
      canvas: { width: 1200, height: 630 },
      ...partial,
    });
    expect(brief.steps?.length).toBeGreaterThan(0);
  });
});
