import type { BatchManifest } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import { assertAssessmentBatchForPromotion, validateAssessmentBatchForPromotion } from "./batch-gates.js";

function baseManifest(overrides: Partial<BatchManifest> = {}): BatchManifest {
  return {
    collection: "assessment",
    requested: 1,
    attempted: 1,
    generated: 1,
    validationPassed: 1,
    validationFailed: 0,
    failed: 0,
    aiGenerated: 1,
    fallbackGenerated: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs: 10,
    entries: [
      {
        id: "vf-0001",
        category: "technology",
        topic: "t",
        designType: "banner",
        layoutFamily: "promotional-banner",
        paletteId: "p",
        styleId: "s",
        outputPath: "technology/vf-0001.svg",
        contentMode: "ai",
        aiAttempted: true,
        generatedAt: new Date().toISOString(),
        durationMs: 10,
        validationStatus: "passed",
        validationIssues: [],
      },
    ],
    ...overrides,
  };
}

describe("validateAssessmentBatchForPromotion", () => {
  it("accepts full success with fallback allowed", () => {
    const m = baseManifest({
      entries: [
        {
          ...baseManifest().entries![0],
          contentMode: "fallback",
          aiAttempted: true,
          fallbackReason: "rate limit",
        },
      ],
      aiGenerated: 0,
      fallbackGenerated: 1,
    });
    expect(validateAssessmentBatchForPromotion(m).ok).toBe(true);
  });

  it("rejects validation failures", () => {
    const m = baseManifest({
      validationFailed: 1,
      validationPassed: 0,
      entries: [
        {
          ...baseManifest().entries![0],
          validationStatus: "failed",
          validationIssues: ["x"],
        },
      ],
    });
    expect(validateAssessmentBatchForPromotion(m).ok).toBe(false);
  });

  it("rejects unknown provenance", () => {
    const m = baseManifest({
      entries: [{ ...baseManifest().entries![0], contentMode: "unknown" }],
    });
    expect(() => assertAssessmentBatchForPromotion(m)).toThrow(/unknown provenance/i);
  });
});
