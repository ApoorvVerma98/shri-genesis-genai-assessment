import { describe, expect, it } from "vitest";

/** Mirrors manifest aggregation in runBatch for provenance reporting. */
function summarizeProvenance(
  entries: { contentMode: string; aiAttempted?: boolean }[],
) {
  return {
    aiGenerated: entries.filter((e) => e.contentMode === "ai").length,
    fallbackGenerated: entries.filter((e) => e.contentMode === "fallback").length,
    unknownGenerated: entries.filter((e) => e.contentMode === "unknown").length,
    aiAttempted: entries.filter((e) => e.aiAttempted).length,
    aiFailedThenFallback: entries.filter(
      (e) => e.aiAttempted && e.contentMode === "fallback",
    ).length,
  };
}

describe("provenance counts", () => {
  it("never counts fallback as ai", () => {
    const entries = [
      { contentMode: "ai", aiAttempted: true },
      { contentMode: "fallback", aiAttempted: true },
      { contentMode: "fallback", aiAttempted: false },
    ];
    const s = summarizeProvenance(entries);
    expect(s.aiGenerated).toBe(1);
    expect(s.fallbackGenerated).toBe(2);
    expect(s.aiFailedThenFallback).toBe(1);
  });
});
