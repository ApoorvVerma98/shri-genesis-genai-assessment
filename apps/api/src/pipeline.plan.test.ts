import { describe, expect, it } from "vitest";
import { buildPlanFromRequest } from "./pipeline.js";

describe("buildPlanFromRequest", () => {
  it("builds legacy count plan", () => {
    const plan = buildPlanFromRequest({ count: 10, seed: 42 }, "legacy");
    expect(plan).toHaveLength(10);
  });

  it("builds segmented plan with correct totals and assignments", () => {
    const plan = buildPlanFromRequest(
      {
        segments: [
          { category: "technology", layoutFamily: "promotional-banner", count: 50 },
          { category: "healthcare", layoutFamily: "editorial-infographic", count: 50 },
        ],
        seed: 1,
      },
      "seg",
    );
    expect(plan).toHaveLength(100);
    expect(plan.filter((p) => p.category === "technology" && p.layoutFamily === "promotional-banner")).toHaveLength(50);
    expect(plan.filter((p) => p.category === "healthcare" && p.layoutFamily === "editorial-infographic")).toHaveLength(50);
  });
});
