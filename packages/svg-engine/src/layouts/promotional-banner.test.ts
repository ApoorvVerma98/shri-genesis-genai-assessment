import { GenerationBriefSchema } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import { renderSvg } from "../render.js";

describe("promotional-banner CTA", () => {
  it("wraps long supporting text without ellipsis truncation", () => {
    const brief = GenerationBriefSchema.parse({
      id: "cta-test",
      category: "technology",
      topic: "Edge AI",
      designType: "banner",
      tone: "bold",
      layoutFamily: "promotional-banner",
      canvas: { width: 1200, height: 630 },
      headline: "Edge AI for smart factories with resilient automation pipelines",
      subtitle: "Deploy models at the edge for real-time decisions across every production line",
      supportingText:
        "Edge AI empowers factories with real-time insights, zero-latency decisions, and scalable automation across sites",
    });
    const svg = renderSvg(brief, { styleId: "tech-pulse", paletteId: "midnight-cyan" });
    expect(svg).not.toContain("…");
    expect(svg).toMatch(/Edge AI empowers/i);
  });

  it("fits long topic copy in sidebar without ellipsis", () => {
    const brief = GenerationBriefSchema.parse({
      id: "topic-test",
      category: "technology",
      topic:
        "Enterprise edge AI platforms for resilient smart-factory automation with zero-latency quality control",
      designType: "banner",
      tone: "bold",
      layoutFamily: "promotional-banner",
      canvas: { width: 1200, height: 630 },
      headline: "Edge AI",
      supportingText: "Deploy now across every production line",
    });
    const svg = renderSvg(brief, { styleId: "tech-pulse", paletteId: "midnight-cyan" });
    expect(svg).not.toContain("…");
    expect(svg).toMatch(/zero-latency|quality control/i);
  });

  it("uses supporting text for CTA when available", () => {
    const brief = GenerationBriefSchema.parse({
      id: "cta2",
      category: "technology",
      topic: "Edge AI",
      designType: "banner",
      tone: "bold",
      layoutFamily: "promotional-banner",
      canvas: { width: 1200, height: 630 },
      headline: "Edge AI",
      supportingText: "Start your pilot today",
    });
    const svg = renderSvg(brief, { styleId: "tech-pulse", paletteId: "midnight-cyan" });
    expect(svg).toMatch(/Start your pilot today/i);
  });
});
