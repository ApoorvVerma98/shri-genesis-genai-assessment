import { describe, expect, it } from "vitest";
import { buildSingleDesignSeed } from "./topics.js";

describe("buildSingleDesignSeed", () => {
  it("uses user brief as topic and matches category/layout", () => {
    const seed = buildSingleDesignSeed({
      category: "healthcare",
      layoutFamily: "quote-banner",
      topic: "Encourage patients to follow prescribed medication schedules.",
    });
    expect(seed.topic).toContain("medication");
    expect(seed.category).toBe("healthcare");
    expect(seed.layoutFamily).toBe("quote-banner");
    expect(seed.designType).toBe("social");
    expect(seed.tone).not.toMatch(/innovative/i);
    expect(seed.topic).not.toMatch(/smart factory/i);
  });

  it("derives category-appropriate default topic when brief omitted", () => {
    const seed = buildSingleDesignSeed({
      category: "real-estate",
      layoutFamily: "step-by-step",
    });
    expect(seed.category).toBe("real-estate");
    expect(seed.layoutFamily).toBe("step-by-step");
    expect(seed.designType).toBe("education");
    expect(seed.topic.toLowerCase()).not.toContain("edge ai");
  });

  it("produces different topics for different briefs with same category/layout", () => {
    const a = buildSingleDesignSeed({
      category: "healthcare",
      layoutFamily: "quote-banner",
      topic: "Medication adherence for seniors at home.",
    });
    const b = buildSingleDesignSeed({
      category: "healthcare",
      layoutFamily: "quote-banner",
      topic: "Telehealth check-ins for rural clinics.",
    });
    expect(a.topic).not.toBe(b.topic);
  });
});
