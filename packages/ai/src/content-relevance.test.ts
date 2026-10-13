import type { TopicSeed } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import type { AiContentPartial } from "./ai-output-schema.js";
import { mergeBrief } from "./openai-compatible.js";
import {
  assessContentRelevance,
  validateAiContent,
  validateLayoutFields,
  validateMetricsClaims,
} from "./content-relevance.js";
import { generateFallbackBrief } from "./fallback.js";

function seed(partial: Partial<TopicSeed>): TopicSeed {
  return {
    id: "test-1",
    category: "healthcare",
    topic: "Encourage patients to follow prescribed medication schedules.",
    layoutFamily: "quote-banner",
    designType: "social",
    tone: "compassionate",
    targetAudience: "patients",
    ...partial,
  };
}

describe("validateLayoutFields", () => {
  it("requires quote for quote-banner", () => {
    const s = seed({ layoutFamily: "quote-banner" });
    expect(validateLayoutFields(s, { headline: "Hi" })).toContain("quote-banner requires quote.text");
  });

  it("requires metrics for metrics-dashboard", () => {
    const s = seed({ category: "ecommerce", layoutFamily: "metrics-dashboard", topic: "Checkout performance" });
    expect(validateLayoutFields(s, { headline: "Metrics" })).toContain("metrics-dashboard requires metrics");
  });

  it("requires steps for step-by-step", () => {
    const s = seed({
      category: "real-estate",
      layoutFamily: "step-by-step",
      topic: "First-time buyer steps before purchasing a home.",
    });
    expect(validateLayoutFields(s, { headline: "Buy a home" })).toContain("step-by-step requires steps");
  });
});

describe("assessContentRelevance", () => {
  it("flags edge AI leakage for healthcare brief", () => {
    const s = seed({});
    const partial: AiContentPartial = {
      headline: "Edge AI for smart factories",
      quote: { text: "Automate production lines with zero-latency edge AI." },
    };
    expect(assessContentRelevance(s, partial).some((m) => m.includes("manufacturing"))).toBe(true);
  });

  it("accepts healthcare quote aligned with medication brief", () => {
    const s = seed({});
    const partial: AiContentPartial = {
      headline: "Stay on schedule",
      quote: {
        text: "Taking medication at the same time each day helps patients stay healthy and avoid complications.",
        attribution: "Care team",
      },
    };
    expect(assessContentRelevance(s, partial)).toEqual([]);
  });

  it("allows technology content when brief explicitly requests edge AI", () => {
    const s = seed({
      category: "technology",
      topic: "Edge AI for smart factories with resilient automation",
      layoutFamily: "promotional-banner",
      designType: "banner",
    });
    const partial: AiContentPartial = {
      headline: "Edge AI for smart factories",
      supportingText: "Deploy edge AI on the factory floor.",
    };
    expect(assessContentRelevance(s, partial)).toEqual([]);
  });
});

describe("fallback and merge provenance", () => {
  it("healthcare and real-estate quote fallbacks differ for same layout", () => {
    const health = seed({ category: "healthcare", layoutFamily: "quote-banner" });
    const re = seed({
      category: "real-estate",
      layoutFamily: "quote-banner",
      topic: "First-time buyer readiness before purchasing a home.",
    });
    const hFb = generateFallbackBrief(health).partial;
    const rFb = generateFallbackBrief(re).partial;
    expect(hFb.quote?.text).not.toBe(rFb.quote?.text);
    expect(hFb.quote?.text?.toLowerCase()).toMatch(/healthcare|medication|patient|care|follow/i);
    expect(rFb.quote?.text?.toLowerCase()).toMatch(/home|buyer|real|purchas/i);
  });

  it("mergeBrief preserves seed category and topic over partial", () => {
    const s = seed({ category: "healthcare" });
    const brief = mergeBrief(
      s,
      {
        headline: "Medication matters",
        quote: { text: "Follow your prescribed schedule every day." },
      },
      "vf-test",
    );
    expect(brief.category).toBe("healthcare");
    expect(brief.topic).toContain("medication");
    expect(brief.layoutFamily).toBe("quote-banner");
    expect(brief.quote?.text?.toLowerCase()).toMatch(/medication|prescribed|patient|schedule/);
  });
});

describe("validateAiContent integration", () => {
  it("passes complete healthcare quote partial", () => {
    const s = seed({});
    const partial: AiContentPartial = {
      headline: "Medication adherence",
      quote: { text: "Patients who follow prescribed medication schedules see better outcomes." },
    };
    expect(validateAiContent(s, partial)).toEqual([]);
  });
});

describe("category regression scenarios", () => {
  it("Healthcare + quote-banner: medication schedule brief passes aligned copy", () => {
    const s = seed({
      topic: "Encourage patients to follow prescribed medication schedules.",
      layoutFamily: "quote-banner",
    });
    const partial: AiContentPartial = {
      headline: "Stay on your schedule",
      quote: {
        text: "Following prescribed medication schedules helps patients avoid complications and stay healthier.",
        attribution: "Clinical care team",
      },
    };
    expect(validateAiContent(s, partial)).toEqual([]);
  });

  it("Real estate + step-by-step: first-time buyer steps pass relevance", () => {
    const s = seed({
      category: "real-estate",
      layoutFamily: "step-by-step",
      topic: "Steps for first-time home buyers before closing on a property.",
      designType: "education",
      targetAudience: "home buyers",
    });
    const partial: AiContentPartial = {
      headline: "Your path to a first home",
      steps: [
        { title: "Check credit", description: "Review credit reports and resolve issues before applying for a mortgage." },
        { title: "Set a budget", description: "Calculate what you can afford including taxes, insurance, and maintenance." },
        { title: "Get pre-approved", description: "Work with a lender to understand loan options for first-time buyers." },
        { title: "Tour neighborhoods", description: "Visit homes and evaluate commute, schools, and walkability." },
      ],
    };
    expect(validateAiContent(s, partial)).toEqual([]);
  });

  it("Ecommerce + metrics-dashboard: rejects fabricated precise stats without illustrative flag", () => {
    const s = seed({
      category: "ecommerce",
      layoutFamily: "metrics-dashboard",
      topic: "Checkout performance metrics for online stores.",
      designType: "infographic",
    });
    const bad: AiContentPartial = {
      headline: "Checkout pulse",
      metrics: [
        { label: "Conversion rate", value: "3.8%", illustrative: false },
        { label: "Cart recovery", value: "12%", note: "Last 30 days" },
      ],
    };
    expect(validateMetricsClaims(bad).length).toBeGreaterThan(0);
    expect(validateAiContent(s, bad).some((m) => m.includes("illustrative"))).toBe(true);

    const good: AiContentPartial = {
      headline: "Checkout pulse",
      metrics: [
        { label: "Checkout completion", value: "Improving", illustrative: true, note: "Illustrative trend" },
        { label: "Cart abandonment", value: "↓", illustrative: true },
        { label: "Payment errors", value: "Fewer", illustrative: true },
      ],
    };
    expect(validateAiContent(s, good)).toEqual([]);
  });

  it("different briefs yield different fallback copy for the same category and layout", () => {
    const a = seed({
      topic: "Medication adherence for seniors at home.",
      layoutFamily: "quote-banner",
    });
    const b = seed({
      topic: "Telehealth check-ins for rural clinics.",
      layoutFamily: "quote-banner",
    });
    const aText = generateFallbackBrief(a).partial.quote?.text ?? "";
    const bText = generateFallbackBrief(b).partial.quote?.text ?? "";
    expect(aText).not.toBe(bText);
    expect(aText.toLowerCase()).toMatch(/medication|adherence|seniors/);
    expect(bText.toLowerCase()).toMatch(/telehealth|rural|clinics/);
  });

  it("fallback brief stays category-relevant and is not labeled as AI", () => {
    const s = seed({
      category: "real-estate",
      layoutFamily: "step-by-step",
      topic: "First-time buyer readiness before purchasing a home.",
      designType: "education",
    });
    const fb = generateFallbackBrief(s);
    expect(fb.mode).toBe("fallback");
    const steps = fb.partial.steps ?? [];
    expect(steps.length).toBeGreaterThan(0);
    const blob = steps.map((st) => `${st.title} ${st.description}`).join(" ").toLowerCase();
    expect(blob).toMatch(/home|buyer|purchas/);
    expect(blob).not.toMatch(/smart factory|edge ai/i);
  });
});
