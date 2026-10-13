import { describe, expect, it } from "vitest";
import { interpretExecutionRun } from "./assessment-audit.js";

describe("interpretExecutionRun", () => {
  it("flags stale in_progress as interrupted", () => {
    const msg = interpretExecutionRun({
      status: "in_progress",
      runId: "x",
      collection: "assessment",
      requested: 100,
      startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    });
    expect(msg).toContain("INTERRUPTED");
  });

  it("does not claim success for in_progress recent", () => {
    const msg = interpretExecutionRun({
      status: "in_progress",
      runId: "x",
      collection: "assessment",
      requested: 100,
      startedAt: new Date().toISOString(),
    });
    expect(msg).toContain("in progress");
    expect(msg).not.toContain("completed");
  });
});
