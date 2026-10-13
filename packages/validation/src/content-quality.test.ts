import { describe, expect, it } from "vitest";
import { detectGenericCopy, detectHeadlineRepetition } from "./content-quality.js";
import { GenerationBriefSchema } from "@vector-forge/shared";

describe("content-quality", () => {
  it("flags legacy generic phrases", () => {
    const brief = GenerationBriefSchema.parse({
      id: "x",
      category: "business",
      topic: "Test",
      designType: "banner",
      tone: "calm",
      layoutFamily: "promotional-banner",
      canvas: { width: 1200, height: 630 },
      headline: "Test",
      keyPoints: ["Common pitfalls to avoid"],
    });
    expect(detectGenericCopy(brief).length).toBeGreaterThan(0);
  });

  it("detects duplicate headlines", () => {
    const dups = detectHeadlineRepetition(["Hello", "hello", "Other"]);
    expect(dups.size).toBe(1);
    expect(dups.get("hello")?.length).toBe(2);
  });
});
