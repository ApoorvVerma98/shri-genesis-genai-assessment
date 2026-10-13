import type { TopicSeed } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import { createContentGenerator } from "./factory.js";

const seed: TopicSeed = {
  id: "vf-9001",
  category: "finance",
  topic: "Cash flow cadence",
  layoutFamily: "metrics-dashboard",
  designType: "infographic",
  tone: "steady",
  targetAudience: "SMB owners",
};

describe("createContentGenerator", () => {
  it("labels pure fallback when AI not configured", async () => {
    const gen = createContentGenerator({ AI_PROVIDER: "fallback" });
    const r = await gen.generate(seed, seed.id);
    expect(r.mode).toBe("fallback");
    expect(r.aiAttempted).toBe(false);
    expect(r.brief.headline).not.toContain("a focused guide");
  });

  it("does not mark AI success when provider fails and fallback is used", async () => {
    const gen = createContentGenerator({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: "invalid-key-for-test",
      AI_BASE_URL: "http://127.0.0.1:1/openai/v1",
      AI_MODEL: "openai/gpt-oss-20b",
      AI_ALLOW_FALLBACK: "true",
    });
    const r = await gen.generate(seed, seed.id);
    expect(r.mode).toBe("fallback");
    expect(r.aiAttempted).toBe(true);
    expect(r.fallbackReason).toBeTruthy();
  });
});
