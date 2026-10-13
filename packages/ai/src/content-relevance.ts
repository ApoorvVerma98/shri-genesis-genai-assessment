import type { TopicSeed } from "@vector-forge/shared";
import type { AiContentPartial } from "./ai-output-schema.js";

const UNRELATED_TECH_PATTERNS = [
  /\bedge\s*ai\b/i,
  /\bsmart\s*factories?\b/i,
  /\bmanufacturing\s+automation\b/i,
  /\bzero[- ]latency\s+quality\s+control\b/i,
  /\bproduction\s+lines?\b/i,
  /\bfactory\s+floor\b/i,
  /\bshop\s+floor\b/i,
  /\bresilient\s+automation\b/i,
];

/** Values that look like precise statistics (require illustrative: true on the metric). */
const PRECISE_METRIC_VALUE = /^\s*[-+]?\d+(\.\d+)?\s*%?\s*$/;
const PRECISE_STAT_IN_TEXT = /\b\d+(\.\d+)?\s*%|\b\d{1,3}(,\d{3})+\+?\b/i;

const CATEGORY_AFFINITY: Record<string, string[]> = {
  healthcare: ["health", "patient", "care", "medical", "clinic", "medication", "doctor", "nurse"],
  "real-estate": ["home", "buyer", "mortgage", "property", "house", "real estate", "neighborhood"],
  finance: ["cash", "fund", "invest", "budget", "financial", "savings", "credit"],
  ecommerce: ["store", "cart", "checkout", "shop", "merchant", "customer", "order"],
  education: ["learn", "student", "classroom", "course", "skill", "teach"],
  technology: ["software", "data", "cloud", "ai", "digital", "platform", "engineering"],
  business: ["team", "customer", "growth", "revenue", "strategy", "operational"],
  marketing: ["brand", "campaign", "audience", "content", "channel"],
  cybersecurity: ["security", "threat", "phish", "auth", "access", "incident"],
  sustainability: ["carbon", "energy", "climate", "recycle", "sustainable", "emission"],
  productivity: ["focus", "meeting", "workflow", "async", "team"],
  "social-awareness": ["community", "inclusive", "mental", "literacy", "awareness"],
};

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

export function collectPartialText(partial: AiContentPartial): string {
  const parts: string[] = [
    partial.headline,
    partial.subtitle,
    partial.supportingText,
    partial.quote?.text,
    ...(partial.keyPoints ?? []),
    ...(partial.steps?.map((s) => `${s.title} ${s.description}`) ?? []),
    ...(partial.metrics?.map((m) => `${m.label} ${m.value} ${m.note ?? ""}`) ?? []),
    ...(partial.comparison?.items.flatMap((i) => [i.name, ...i.points]) ?? []),
    partial.comparison?.leftTitle,
    partial.comparison?.rightTitle,
  ].filter(Boolean) as string[];
  return parts.join(" ");
}

/** Layout-specific required fields from AI partial. */
export function validateLayoutFields(seed: TopicSeed, partial: AiContentPartial): string[] {
  const issues: string[] = [];
  switch (seed.layoutFamily) {
    case "quote-banner":
      if (!partial.quote?.text?.trim()) issues.push("quote-banner requires quote.text");
      break;
    case "metrics-dashboard":
      if (!partial.metrics?.length) issues.push("metrics-dashboard requires metrics");
      break;
    case "step-by-step":
      if (!partial.steps?.length) issues.push("step-by-step requires steps");
      break;
    case "comparison":
      if (!partial.comparison?.items?.length || partial.comparison.items.length < 2) {
        issues.push("comparison requires two sides with points");
      }
      break;
    case "feature-grid":
    case "list-announcement":
    case "editorial-infographic":
      if (!partial.keyPoints?.length && !partial.supportingText?.trim()) {
        issues.push(`${seed.layoutFamily} requires keyPoints or supportingText`);
      }
      break;
    case "promotional-banner":
      if (!partial.headline?.trim()) issues.push("promotional-banner requires headline");
      break;
    default:
      break;
  }
  return issues;
}

/**
 * Lightweight relevance check — flags obvious cross-category leakage and missing brief alignment.
 * Allows explicit cross-domain briefs when user topic mentions those terms.
 */
export function assessContentRelevance(seed: TopicSeed, partial: AiContentPartial): string[] {
  const issues: string[] = [];
  const blob = collectPartialText(partial);
  const blobLower = blob.toLowerCase();
  const topicLower = seed.topic.toLowerCase();

  const userAllowsTechLeak = UNRELATED_TECH_PATTERNS.some((p) => p.test(topicLower));
  if (seed.category !== "technology" && !userAllowsTechLeak) {
    for (const p of UNRELATED_TECH_PATTERNS) {
      if (p.test(blob)) {
        issues.push("content references unrelated manufacturing/edge-AI themes");
        break;
      }
    }
  }

  const briefTokens = significantTokens(seed.topic);
  const briefHit = briefTokens.filter((t) => blobLower.includes(t)).length;
  const affinity = CATEGORY_AFFINITY[seed.category] ?? [];
  const categoryHit = affinity.some((term) => blobLower.includes(term.toLowerCase()));

  if (briefTokens.length >= 2 && briefHit === 0 && !categoryHit) {
    issues.push("content does not reflect the user brief or selected category");
  }

  if (briefTokens.length === 0 && !categoryHit && seed.category !== "technology") {
    issues.push("content lacks clear subject matter for the selected category");
  }

  return issues;
}

export function validateMetricsClaims(partial: AiContentPartial): string[] {
  const issues: string[] = [];
  for (const m of partial.metrics ?? []) {
    const value = m.value?.trim() ?? "";
    if (PRECISE_METRIC_VALUE.test(value) && m.illustrative !== true) {
      issues.push(`metric "${m.label}" uses a precise numeric value without illustrative: true`);
    }
    const combined = `${m.value ?? ""} ${m.note ?? ""}`;
    if (PRECISE_STAT_IN_TEXT.test(combined) && m.illustrative !== true) {
      issues.push(`metric "${m.label}" implies a precise statistic without illustrative: true`);
    }
  }
  return issues;
}

export function validateAiContent(seed: TopicSeed, partial: AiContentPartial): string[] {
  return [
    ...validateLayoutFields(seed, partial),
    ...assessContentRelevance(seed, partial),
    ...validateMetricsClaims(partial),
  ];
}
