import { describe, expect, it, vi } from "vitest";
import { getAiBatchDelayMs } from "./pipeline.js";

describe("getAiBatchDelayMs", () => {
  it("reads AI_BATCH_DELAY_MS from env", () => {
    expect(getAiBatchDelayMs({ AI_BATCH_DELAY_MS: "3000" })).toBe(3000);
  });

  it("returns 0 when unset or invalid", () => {
    expect(getAiBatchDelayMs({})).toBe(0);
    expect(getAiBatchDelayMs({ AI_BATCH_DELAY_MS: "nope" })).toBe(0);
  });
});

describe("aiBatchThrottle", () => {
  it("waits when delay configured", async () => {
    vi.useFakeTimers();
    const { aiBatchThrottle } = await import("./pipeline.js");
    const p = aiBatchThrottle({ AI_BATCH_DELAY_MS: "100" });
    await vi.advanceTimersByTimeAsync(100);
    await p;
    vi.useRealTimers();
  });
});
