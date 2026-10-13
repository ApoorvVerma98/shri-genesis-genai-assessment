import { GenerationBriefSchema } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import { detectSvgTextTruncation } from "@vector-forge/validation";
import { renderSvg } from "../render.js";
import {
  fitEditorialKeyPointInTile,
  validateEditorialLayoutFit,
} from "./editorial-tile-fit.js";

const base = {
  id: "ed-test",
  category: "cybersecurity" as const,
  topic: "Phishing-resistant authentication",
  designType: "infographic" as const,
  tone: "professional",
  layoutFamily: "editorial-infographic" as const,
  canvas: { width: 1200, height: 630 },
  headline: "Phishing-Resistant Authentication",
  supportingText: "Adopt phishing-resistant mechanisms to block malicious attempts at the source.",
};

/** Key point #2 from staged vf-0055 (truncated in failed Phase E SVG). */
const VF0055_LONG_POINT =
  "Contextual MFA: Use adaptive authentication that requires additional factors only when risk indicators exceed threshold";

const VF0091_LONG_POINTS = [
  "Adaptive Risk Scoring: Dynamic evaluation of user behavior, device posture, and network context to adjust authentication strength",
  "Encrypted Assertion Exchange: Secure tokenization of authentication claims that cannot be replayed or forged",
];

describe("editorial key-point tile fit", () => {
  it("fits long key points without ellipsis (vf-0055 style copy)", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      keyPoints: [
        "Zero-Click Prevention: Deploy link validation that blocks malicious URLs before they reach users",
        VF0055_LONG_POINT,
        "Secure Email Gateways: Filter and quarantine spoofed messages at the perimeter",
        "Continuous Monitoring: Implement real-time analytics to detect anomalous login patterns",
      ],
    });
    expect(validateEditorialLayoutFit(brief)).toEqual([]);
    const svg = renderSvg(brief, { styleId: "tech-pulse", paletteId: "midnight-cyan" });
    expect(svg).not.toContain("…");
    expect(detectSvgTextTruncation(svg)).toEqual([]);
    expect(svg).toMatch(/risk indicators exceed threshold/i);
  });

  it("fits vf-0091 style long key points without ellipsis", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      keyPoints: [
        "Zero-Trust MFA: Authentication is required for every access request, regardless of device or location",
        VF0091_LONG_POINTS[0],
        "Behavioral Biometrics: Continuous monitoring of typing patterns, mouse movements, and device signals",
        VF0091_LONG_POINTS[1],
      ],
    });
    const svg = renderSvg(brief, { styleId: "tech-pulse", paletteId: "midnight-cyan" });
    expect(svg).not.toContain("…");
    expect(detectSvgTextTruncation(svg)).toEqual([]);
    expect(svg).toMatch(/cannot be replayed or forged/i);
  });

  it("reports validation failure when a key point cannot fit at minimum font", () => {
    const colW = (1200 - 32 * 3) / 2;
    const absurd = `${"Supercalifragilisticexpialidocious ".repeat(12)}and more context`;
    expect(fitEditorialKeyPointInTile(absurd, colW)).toBeNull();
    const brief = GenerationBriefSchema.parse({ ...base, keyPoints: ["Short point"] });
    const tooLongBrief = { ...brief, keyPoints: [absurd] };
    expect(validateEditorialLayoutFit(tooLongBrief).length).toBeGreaterThan(0);
  });
});
