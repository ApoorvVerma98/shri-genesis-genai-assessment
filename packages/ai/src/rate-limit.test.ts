import { describe, expect, it } from "vitest";
import { classifyHttpFailure, computeBackoffMs, parseRetryAfterMs } from "./rate-limit.js";

describe("rate-limit", () => {
  it("parses Retry-After seconds", () => {
    const h = new Headers({ "retry-after": "3" });
    expect(parseRetryAfterMs(h)).toBe(3000);
  });

  it("classifies 429 as retryable", () => {
    const h = new Headers();
    const d = classifyHttpFailure(429, "rate limit", h);
    expect(d.retryable).toBe(true);
    expect(d.retryAfterMs).toBeGreaterThan(0);
  });

  it("backs off with attempt index", () => {
    const ms = computeBackoffMs(2, 0, 500, 30_000);
    expect(ms).toBeGreaterThanOrEqual(2000);
  });
});
