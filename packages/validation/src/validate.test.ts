import { GenerationBriefSchema } from "@vector-forge/shared";
import { renderSvg } from "@vector-forge/svg-engine";
import { describe, expect, it } from "vitest";
import { validateBriefContent, validateSvgStructure } from "./validate.js";
import { LAYOUT_FAMILIES } from "@vector-forge/shared";

const baseBrief = {
  id: "test-1",
  category: "technology" as const,
  topic: "Test topic",
  designType: "infographic" as const,
  tone: "professional",
  canvas: { width: 1200, height: 630 },
  headline: "Test Headline",
  subtitle: "Sub",
  keyPoints: ["One", "Two", "Three"],
  steps: [{ title: "A", description: "Do A" }],
  metrics: [{ label: "X", value: "1", illustrative: true }],
  comparison: {
    leftTitle: "L",
    rightTitle: "R",
    items: [
      { name: "L", points: ["a"] },
      { name: "R", points: ["b"] },
    ],
  },
  quote: { text: "Hello world", attribution: "Author" },
};

describe("validateSvgStructure", () => {
  it("rejects script injection", () => {
    const r = validateSvgStructure('<svg><script>alert(1)</script></svg>');
    expect(r.passed).toBe(false);
  });

  it("accepts rendered layouts", () => {
    for (const layout of LAYOUT_FAMILIES) {
      const brief = GenerationBriefSchema.parse({
        ...baseBrief,
        layoutFamily: layout,
      });
      const svg = renderSvg(brief);
      const r = validateSvgStructure(svg);
      expect(r.passed, layout).toBe(true);
    }
  });
});

describe("validateBriefContent", () => {
  it("flags missing metrics for metrics layout", () => {
    const brief = GenerationBriefSchema.parse({
      ...baseBrief,
      layoutFamily: "metrics-dashboard",
      metrics: undefined,
    });
    expect(validateBriefContent(brief).length).toBeGreaterThan(0);
  });
});
