import { describe, expect, it } from "vitest";
import type { BatchManifest } from "./schemas.js";
import { reconcileAssessmentManifest } from "./reconcile-assessment.js";

const baseline: BatchManifest = {
  requested: 1,
  attempted: 1,
  generated: 1,
  validationPassed: 1,
  validationFailed: 0,
  failed: 0,
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:00:01Z",
  totalDurationMs: 1,
  entries: [
    {
      id: "vf-0001",
      category: "technology",
      topic: "Test",
      designType: "banner",
      layoutFamily: "promotional-banner",
      paletteId: "midnight-cyan",
      styleId: "tech-pulse",
      outputPath: "technology/vf-0001.svg",
      contentMode: "fallback",
      generatedAt: "2026-01-01T00:00:00Z",
      durationMs: 1,
      validationStatus: "passed",
      validationIssues: [],
      contentHash: "aaa",
    },
  ],
};

describe("reconcileAssessmentManifest", () => {
  it("preserves fallback when hash matches baseline", async () => {
    const result = await reconcileAssessmentManifest({
      baselineManifest: baseline,
      readSvg: async () => ({ svg: "<svg></svg>", resolvedFrom: "outputs" }),
      validateEntry: () => ({ contentHash: "aaa", structureHash: "b", issues: [] }),
    });
    expect(result.manifest.entries[0].contentMode).toBe("fallback");
    expect(result.stats.unknownProvenance).toBe(0);
  });

  it("marks unknown when hash differs on outputs", async () => {
    const result = await reconcileAssessmentManifest({
      baselineManifest: baseline,
      readSvg: async () => ({ svg: "<svg></svg>", resolvedFrom: "outputs" }),
      validateEntry: () => ({ contentHash: "bbb", structureHash: "b", issues: [] }),
    });
    expect(result.manifest.entries[0].contentMode).toBe("unknown");
    expect(result.manifest.entries[0].provenanceNote).toMatch(/unknown/i);
  });
});
