import type { BatchSegment } from "./batch-config.js";
import type { Category, LayoutFamily } from "./schemas.js";

export interface TopicSeed {
  id: string;
  category: Category;
  topic: string;
  layoutFamily: LayoutFamily;
  designType: "banner" | "infographic" | "social" | "announcement" | "education";
  tone: string;
  targetAudience: string;
}

const layouts: LayoutFamily[] = [
  "promotional-banner",
  "editorial-infographic",
  "metrics-dashboard",
  "step-by-step",
  "comparison",
  "feature-grid",
  "quote-banner",
  "list-announcement",
];

const cleaned: Omit<TopicSeed, "id" | "layoutFamily">[] = [
  { category: "technology", topic: "Edge AI for smart factories", designType: "infographic", tone: "innovative", targetAudience: "engineering leaders" },
  { category: "technology", topic: "Responsible generative AI guardrails", designType: "education", tone: "clear", targetAudience: "product teams" },
  { category: "technology", topic: "Open-source observability stacks", designType: "infographic", tone: "technical", targetAudience: "SRE teams" },
  { category: "business", topic: "Bootstrapping a B2B SaaS in 90 days", designType: "banner", tone: "bold", targetAudience: "founders" },
  { category: "business", topic: "Customer success playbooks that scale", designType: "infographic", tone: "practical", targetAudience: "CS leaders" },
  { category: "business", topic: "Pricing experiments without churn", designType: "infographic", tone: "analytical", targetAudience: "revenue ops" },
  { category: "education", topic: "Active learning in hybrid classrooms", designType: "infographic", tone: "encouraging", targetAudience: "educators" },
  { category: "education", topic: "STEM mentorship for underserved youth", designType: "social", tone: "inspiring", targetAudience: "nonprofits" },
  { category: "education", topic: "Micro-credentials for career changers", designType: "education", tone: "supportive", targetAudience: "adult learners" },
  { category: "healthcare", topic: "Telehealth access in rural communities", designType: "banner", tone: "compassionate", targetAudience: "clinic administrators" },
  { category: "healthcare", topic: "Preventive care awareness week", designType: "announcement", tone: "friendly", targetAudience: "patients" },
  { category: "healthcare", topic: "Medication adherence tips", designType: "infographic", tone: "clear", targetAudience: "caregivers" },
  { category: "finance", topic: "Building an emergency fund roadmap", designType: "infographic", tone: "trustworthy", targetAudience: "young professionals" },
  { category: "finance", topic: "Understanding ESG fund labels", designType: "education", tone: "neutral", targetAudience: "investors" },
  { category: "finance", topic: "Small business cash flow cadence", designType: "infographic", tone: "steady", targetAudience: "SMB owners" },
  { category: "marketing", topic: "Content repurposing across channels", designType: "infographic", tone: "energetic", targetAudience: "marketers" },
  { category: "marketing", topic: "Brand storytelling for product launches", designType: "banner", tone: "creative", targetAudience: "brand managers" },
  { category: "marketing", topic: "Community-led growth loops", designType: "social", tone: "authentic", targetAudience: "growth leads" },
  { category: "cybersecurity", topic: "Phishing-resistant authentication", designType: "infographic", tone: "authoritative", targetAudience: "IT admins" },
  { category: "cybersecurity", topic: "Zero-trust for remote teams", designType: "infographic", tone: "direct", targetAudience: "security officers" },
  { category: "cybersecurity", topic: "Incident response tabletop drills", designType: "education", tone: "serious", targetAudience: "SOC teams" },
  { category: "sustainability", topic: "Circular packaging in e-commerce", designType: "infographic", tone: "optimistic", targetAudience: "operations leads" },
  { category: "sustainability", topic: "Office energy reduction challenge", designType: "infographic", tone: "motivating", targetAudience: "facility managers" },
  { category: "sustainability", topic: "Urban tree canopy benefits", designType: "announcement", tone: "hopeful", targetAudience: "city planners" },
  { category: "ecommerce", topic: "Cart abandonment recovery tactics", designType: "infographic", tone: "action-oriented", targetAudience: "store owners" },
  { category: "ecommerce", topic: "Holiday fulfillment readiness", designType: "announcement", tone: "urgent", targetAudience: "logistics teams" },
  { category: "ecommerce", topic: "Product page trust signals", designType: "infographic", tone: "persuasive", targetAudience: "merchants" },
  { category: "productivity", topic: "Deep work blocks for distributed teams", designType: "social", tone: "calm", targetAudience: "team leads" },
  { category: "productivity", topic: "Meeting hygiene checklist", designType: "infographic", tone: "concise", targetAudience: "managers" },
  { category: "productivity", topic: "Async documentation habits", designType: "education", tone: "practical", targetAudience: "remote teams" },
  { category: "social-awareness", topic: "Digital literacy for seniors", designType: "education", tone: "warm", targetAudience: "community organizers" },
  { category: "social-awareness", topic: "Mental health check-in culture", designType: "social", tone: "supportive", targetAudience: "HR teams" },
  { category: "social-awareness", topic: "Inclusive hiring language", designType: "banner", tone: "respectful", targetAudience: "recruiters" },
  { category: "real-estate", topic: "First-time buyer readiness guide", designType: "infographic", tone: "reassuring", targetAudience: "home buyers" },
  { category: "real-estate", topic: "Green building certifications explained", designType: "education", tone: "informative", targetAudience: "developers" },
  { category: "real-estate", topic: "Neighborhood walkability scores", designType: "banner", tone: "upbeat", targetAudience: "realtors" },
];

const preferredLayout: Record<TopicSeed["designType"], LayoutFamily> = {
  banner: "promotional-banner",
  infographic: "editorial-infographic",
  social: "quote-banner",
  announcement: "list-announcement",
  education: "step-by-step",
};

export function buildTopicPlan(count: number, seed = 42): TopicSeed[] {
  const result: TopicSeed[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    const base = cleaned[i % cleaned.length];
    const layoutFamily =
      i < layouts.length
        ? layouts[i % layouts.length]
        : rand() > 0.35
          ? preferredLayout[base.designType]
          : (layouts[Math.floor(rand() * layouts.length)] as LayoutFamily);
    result.push({
      ...base,
      id: `vf-${String(i + 1).padStart(4, "0")}`,
      topic:
        i >= cleaned.length
          ? `${base.topic} (variant ${Math.floor(i / cleaned.length) + 1})`
          : base.topic,
      layoutFamily,
    });
  }
  return result;
}

const layoutDesignType: Record<LayoutFamily, TopicSeed["designType"]> = {
  "promotional-banner": "banner",
  "editorial-infographic": "infographic",
  "metrics-dashboard": "infographic",
  "step-by-step": "education",
  comparison: "infographic",
  "feature-grid": "infographic",
  "quote-banner": "social",
  "list-announcement": "announcement",
};

function topicsForCategory(category: Category): Omit<TopicSeed, "id" | "layoutFamily">[] {
  const pool = cleaned.filter((t) => t.category === category);
  return pool.length ? pool : cleaned;
}

/** Build a plan from explicit category/layout segments (unique IDs per batch run). */
export function buildTargetedTopicPlan(
  segments: BatchSegment[],
  seed = 42,
  batchRunId?: string,
): TopicSeed[] {
  const result: TopicSeed[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const runToken = batchRunId ?? Date.now().toString(36);
  let seq = 0;

  for (const segment of segments) {
    const pool = topicsForCategory(segment.category);
    for (let i = 0; i < segment.count; i++) {
      const pick = pool[Math.floor(rand() * pool.length)] ?? pool[0];
      const variant = Math.floor(i / pool.length);
      seq += 1;
      result.push({
        id: `vf-${runToken}-${String(seq).padStart(4, "0")}`,
        category: segment.category,
        topic:
          variant > 0
            ? `${pick.topic} (variant ${variant + 1})`
            : pick.topic,
        layoutFamily: segment.layoutFamily,
        designType: layoutDesignType[segment.layoutFamily],
        tone: pick.tone,
        targetAudience: pick.targetAudience,
      });
    }
  }
  return result;
}

export interface SingleDesignRequest {
  category?: Category;
  layoutFamily?: LayoutFamily;
  /** User brief — when set, becomes the authoritative topic for copy generation. */
  topic?: string;
}

/**
 * Build a TopicSeed for one-off /api/generate requests.
 * Does not use buildTopicPlan() — avoids leaking unrelated batch topics (e.g. Edge AI).
 */
export function buildSingleDesignSeed(
  req: SingleDesignRequest,
  id = `single-${Date.now()}`,
): TopicSeed {
  const category = req.category ?? "technology";
  const layoutFamily = req.layoutFamily ?? "promotional-banner";
  const pool = topicsForCategory(category);
  const pick = pool[0] ?? cleaned[0];
  const brief = req.topic?.trim();
  const topic = brief && brief.length >= 3 ? brief : pick.topic;

  return {
    id,
    category,
    layoutFamily,
    designType: layoutDesignType[layoutFamily],
    topic,
    tone: pick.tone,
    targetAudience: pick.targetAudience,
  };
}

export const LAYOUT_FAMILIES = layouts;
export const CATEGORIES = [
  "technology",
  "business",
  "education",
  "healthcare",
  "finance",
  "marketing",
  "cybersecurity",
  "sustainability",
  "ecommerce",
  "productivity",
  "social-awareness",
  "real-estate",
] as const;
