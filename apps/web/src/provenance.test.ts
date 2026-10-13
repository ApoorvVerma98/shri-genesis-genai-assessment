import { describe, expect, it } from "vitest";

function summarizeModes(entries: { contentMode: string }[]) {
  const unknown = entries.filter((e) => e.contentMode === "unknown").length;
  return {
    ai: entries.filter((e) => e.contentMode === "ai").length,
    unknown,
    provenanceResolved: entries.length > 0 && unknown === 0,
  };
}

describe("provenance summary", () => {
  it("marks collection unresolved when unknown entries exist", () => {
    const s = summarizeModes([
      { contentMode: "unknown" },
      { contentMode: "unknown" },
    ]);
    expect(s.provenanceResolved).toBe(false);
    expect(s.ai).toBe(0);
  });
});
