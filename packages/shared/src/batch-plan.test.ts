import { describe, expect, it } from "vitest";
import { BatchJobRequestSchema, resolveBatchJob } from "./batch-config.js";
import { buildTargetedTopicPlan } from "./topics.js";

describe("BatchJobRequestSchema", () => {
  it("accepts legacy count-only request", () => {
    const r = BatchJobRequestSchema.parse({ count: 100 });
    expect(resolveBatchJob(r).total).toBe(100);
  });

  it("accepts segments and computes total", () => {
    const r = BatchJobRequestSchema.parse({
      segments: [
        { category: "technology", layoutFamily: "promotional-banner", count: 50 },
        { category: "healthcare", layoutFamily: "editorial-infographic", count: 50 },
      ],
    });
    expect(resolveBatchJob(r).total).toBe(100);
    expect(resolveBatchJob(r).segments?.length).toBe(2);
  });

  it("rejects mismatched count and segment sum", () => {
    const r = BatchJobRequestSchema.safeParse({
      count: 100,
      segments: [{ category: "technology", layoutFamily: "promotional-banner", count: 50 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const r = BatchJobRequestSchema.safeParse({
      segments: [{ category: "invalid", layoutFamily: "promotional-banner", count: 10 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("buildTargetedTopicPlan", () => {
  it("assigns requested category and layout", () => {
    const plan = buildTargetedTopicPlan(
      [{ category: "technology", layoutFamily: "promotional-banner", count: 3 }],
      1,
      "testrun",
    );
    expect(plan).toHaveLength(3);
    for (const p of plan) {
      expect(p.category).toBe("technology");
      expect(p.layoutFamily).toBe("promotional-banner");
    }
  });

  it("supports mixed segment distribution", () => {
    const plan = buildTargetedTopicPlan(
      [
        { category: "technology", layoutFamily: "promotional-banner", count: 2 },
        { category: "healthcare", layoutFamily: "editorial-infographic", count: 2 },
      ],
      99,
      "mix",
    );
    expect(plan.filter((p) => p.layoutFamily === "promotional-banner")).toHaveLength(2);
    expect(plan.filter((p) => p.layoutFamily === "editorial-infographic")).toHaveLength(2);
  });
});
