import { GenerationBriefSchema } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import { renderSvg } from "../render.js";

const base = {
  id: "cmp-render",
  category: "business" as const,
  topic: "Playbooks",
  designType: "infographic" as const,
  tone: "professional",
  layoutFamily: "comparison" as const,
  canvas: { width: 1200, height: 630 },
  headline: "Compare playbook models",
};

function textsAtColumnX(svg: string, xPrefix: string): string[] {
  const re = new RegExp(`<tspan x="${xPrefix}[^"]*"[^>]*>([^<]*)</tspan>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) out.push(m[1]);
  return out;
}

describe("comparison layout column assignment", () => {
  it("renders decentralized copy only in the right column (x≈664+)", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Centralized Playbook Model",
        rightTitle: "Decentralized Playbook Model",
        items: [
          {
            name: "mixed",
            points: [
              "Centralized: strict control over content",
              "Decentralized: flexible local control",
              "Centralized: slower adoption",
              "Decentralized: faster feedback loops",
            ],
          },
          { name: "empty", points: ["unused"] },
        ],
      },
    });
    const svg = renderSvg(brief, { styleId: "tech-pulse", paletteId: "midnight-cyan" });
    const leftTexts = textsAtColumnX(svg, "80");
    const rightTexts = textsAtColumnX(svg, "664");

    expect(leftTexts.join(" ").toLowerCase()).toMatch(/strict control|slower adoption/);
    expect(leftTexts.join(" ").toLowerCase()).not.toMatch(/flexible local|faster feedback/);
    expect(rightTexts.join(" ").toLowerCase()).toMatch(/flexible local|faster feedback/);
    expect(rightTexts.join(" ").toLowerCase()).not.toMatch(/strict control/);
    expect(svg).not.toContain("Decentralized:");
    expect(svg).not.toContain("Centralized:");
  });
});
