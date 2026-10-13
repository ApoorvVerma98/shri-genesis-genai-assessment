import type { Category, TopicSeed } from "@vector-forge/shared";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const HEADLINE_PATTERNS = [
  (t: string) => t,
  (t: string) => `Inside ${t}`,
  (t: string) => `${t}: essentials`,
  (t: string) => `A practical lens on ${t.toLowerCase()}`,
  (t: string) => `Leading with ${t.split(" ")[0] ?? t}`,
  (t: string) => `${t} — field notes`,
];

const CATEGORY_ANGLES: Record<Category, string[]> = {
  technology: ["architecture choices", "deployment guardrails", "observability signals", "team workflows"],
  business: ["revenue levers", "customer outcomes", "operating cadence", "risk controls"],
  education: ["learner engagement", "curriculum design", "assessment loops", "equity of access"],
  healthcare: ["patient experience", "care coordination", "clinical safety", "access barriers"],
  finance: ["cash discipline", "risk literacy", "planning horizons", "regulatory clarity"],
  marketing: ["audience insight", "message testing", "channel mix", "brand trust"],
  cybersecurity: ["threat surfaces", "identity controls", "incident readiness", "policy hygiene"],
  sustainability: ["material flows", "energy intensity", "community impact", "circular design"],
  ecommerce: ["conversion paths", "fulfillment quality", "merchandising clarity", "loyalty loops"],
  productivity: ["focus systems", "async norms", "meeting design", "documentation habits"],
  "social-awareness": ["inclusive outreach", "community trust", "stigma reduction", "accessible language"],
  "real-estate": ["buyer readiness", "neighborhood fit", "financing literacy", "sustainability upgrades"],
};

export function buildFallbackHeadline(seed: TopicSeed): string {
  const idx = hashSeed(`${seed.id}:${seed.category}:${seed.topic}`) % HEADLINE_PATTERNS.length;
  const base = HEADLINE_PATTERNS[idx](seed.topic);
  if (seed.topic.includes("(variant")) {
    const n = seed.topic.match(/variant (\d+)/)?.[1];
    return n ? `${base} · v${n}` : base;
  }
  return base;
}

export function buildFallbackSubtitle(seed: TopicSeed): string {
  const angles = CATEGORY_ANGLES[seed.category];
  const angle = angles[hashSeed(seed.id + "a") % angles.length];
  return `${angle} for ${seed.targetAudience}`;
}

export function categoryKeyPoints(seed: TopicSeed): string[] {
  const angles = CATEGORY_ANGLES[seed.category];
  const i0 = hashSeed(seed.id + "k") % angles.length;
  const i1 = (i0 + 1) % angles.length;
  const i2 = (i0 + 2) % angles.length;
  return [
    `Anchor the story in ${angles[i0]}`,
    `Translate ${seed.topic.toLowerCase()} into ${angles[i1]}`,
    `Measure progress via ${angles[i2]}`,
    `Align ${seed.tone} messaging with ${seed.targetAudience}`,
  ];
}

export function categorySteps(seed: TopicSeed): { title: string; description: string }[] {
  const topic = seed.topic;
  return [
    { title: "Frame", description: `Clarify why ${topic} matters for ${seed.targetAudience}.` },
    { title: "Plan", description: `List constraints, owners, and success signals for ${seed.category}.` },
    { title: "Pilot", description: `Run a small experiment tied to ${topic.toLowerCase()}.` },
    { title: "Scale", description: "Document learnings and expand only what proved useful." },
  ];
}

export function categoryComparison(seed: TopicSeed) {
  const angles = CATEGORY_ANGLES[seed.category];
  return {
    leftTitle: "Status quo",
    rightTitle: "Target state",
    items: [
      {
        name: "Status quo",
        points: [
          `Reactive ${angles[0]}`,
          "Fragmented ownership",
          "Slow feedback loops",
        ],
      },
      {
        name: "Target",
        points: [
          `Proactive ${angles[1]}`,
          "Shared visibility",
          "Weekly learning cadence",
        ],
      },
    ],
  };
}

export function categoryMetrics(seed: TopicSeed) {
  const labelPool = CATEGORY_ANGLES[seed.category];
  return [
    { label: labelPool[0], value: "↑", illustrative: true, note: "Illustrative trend" },
    { label: labelPool[1], value: "3×", illustrative: true, note: "Sample multiplier" },
    { label: "Teams aligned", value: "5+", illustrative: true },
    { label: "Cycle time", value: "Shorter", illustrative: true },
  ];
}
