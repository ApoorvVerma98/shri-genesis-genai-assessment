import type { TopicSeed } from "@vector-forge/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithOpenAICompatible, mergeBrief } from "./openai-compatible.js";

const seed: TopicSeed = {
  id: "t1",
  category: "technology",
  topic: "Edge AI",
  layoutFamily: "promotional-banner",
  designType: "banner",
  tone: "bold",
  targetAudience: "engineers",
};

describe("openai-compatible", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses and validates JSON content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  headline: "Ship edge models safely",
                  subtitle: "For platform teams",
                  supportingText: "Short CTA copy",
                }),
              },
            },
          ],
        }),
      }),
    );

    const result = await generateWithOpenAICompatible(seed, {
      baseUrl: "https://example.com/openai/v1",
      apiKey: "test-key",
      model: "openai/gpt-oss-20b",
      timeoutMs: 5000,
      maxRetries: 0,
    });
    expect(result.mode).toBe("ai");
    const brief = mergeBrief(seed, result.partial, "vf-test");
    expect(brief.headline).toBe("Ship edge models safely");
    expect(brief.layoutFamily).toBe("promotional-banner");
  });

  it("retries on HTTP 429 then succeeds", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        calls++;
        if (calls === 1) {
          return {
            ok: false,
            status: 429,
            headers: new Headers({ "retry-after": "0" }),
            text: async () => "rate limit",
          };
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    headline: "After retry",
                    subtitle: "ok",
                    supportingText: "body",
                    keyPoints: ["a", "b", "c"],
                    callToAction: "Learn more",
                  }),
                },
              },
            ],
          }),
        };
      }),
    );

    const result = await generateWithOpenAICompatible(seed, {
      baseUrl: "https://example.com/openai/v1",
      apiKey: "test-key",
      model: "m",
      timeoutMs: 5000,
      maxRetries: 2,
      retryBaseMs: 10,
      retryMaxMs: 50,
    });
    expect(result.mode).toBe("ai");
    expect(calls).toBeGreaterThan(1);
  });

  it("retries on request timeout then succeeds", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        calls++;
        if (calls === 1) {
          const err = new Error("aborted");
          err.name = "AbortError";
          throw err;
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    headline: "After timeout retry",
                    subtitle: "ok",
                    supportingText: "body",
                    keyPoints: ["a", "b", "c"],
                    callToAction: "Go",
                  }),
                },
              },
            ],
          }),
        };
      }),
    );

    const result = await generateWithOpenAICompatible(seed, {
      baseUrl: "https://example.com/openai/v1",
      apiKey: "test-key",
      model: "m",
      timeoutMs: 5000,
      maxRetries: 2,
      retryBaseMs: 10,
      retryMaxMs: 50,
    });
    expect(result.partial.headline).toBe("After timeout retry");
    expect(calls).toBe(2);
  });

  it("rejects invalid schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ headline: "x" }) } }],
        }),
      }),
    );
    await expect(
      generateWithOpenAICompatible(seed, {
        baseUrl: "https://example.com/openai/v1",
        apiKey: "test-key",
        model: "m",
        timeoutMs: 5000,
        maxRetries: 0,
      }),
    ).rejects.toThrow(/schema/i);
  });
});
