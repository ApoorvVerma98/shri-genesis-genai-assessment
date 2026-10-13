import type { TopicSeed } from "@vector-forge/shared";

export function buildContentPrompt(seed: TopicSeed, correction?: string): string {
  const layoutRequirements = layoutFieldInstructions(seed.layoutFamily);

  return `You are a professional copywriter for marketing and educational graphics.
Create ORIGINAL, concise content for an SVG design.

PRIMARY CONTRACT (must all be satisfied):
1. CATEGORY "${seed.category}" — all copy must be about this subject domain.
2. LAYOUT "${seed.layoutFamily}" — populate only the JSON fields required for this layout (see below).
3. USER BRIEF — treat this as the specific message and intent (highest priority for subject matter):
   "${seed.topic}"

Supporting context (do not override the brief):
- Design type: ${seed.designType}
- Tone: ${seed.tone}
- Audience: ${seed.targetAudience}

${layoutRequirements}

Rules:
- Return ONLY valid JSON matching the schema below (no markdown fences).
- Do NOT write about unrelated domains (e.g. smart factories, edge AI) unless the user brief explicitly asks for them.
- Do not invent precise statistics; if you include metrics, set illustrative: true and use qualitative values or ranges.
- Headline max 100 chars. Subtitle max 140 chars.
- Do not include SVG, HTML, or scripts.
${correction ? `\nCORRECTION REQUIRED (fix these issues in your JSON):\n${correction}\n` : ""}

JSON schema:
{
  "headline": string,
  "subtitle": string optional,
  "supportingText": string optional,
  "keyPoints": string[] optional,
  "steps": [{"title": string, "description": string}] optional,
  "comparison": {"leftTitle": string, "rightTitle": string, "items": [{"name": string, "points": string[]}]} optional,
  "metrics": [{"label": string, "value": string, "note": string optional, "illustrative": boolean optional}] optional,
  "quote": {"text": string, "attribution": string optional} optional,
  "visualMotifs": string[] optional,
  "layoutRecommendation": string optional,
  "styleDirection": string optional
}`;
}

function layoutFieldInstructions(layout: TopicSeed["layoutFamily"]): string {
  switch (layout) {
    case "quote-banner":
      return "Required: quote.text (and optional attribution) — a compelling quote aligned with the brief.";
    case "metrics-dashboard":
      return "Required: metrics (3-4 items) with labels and values relevant to the brief; set illustrative: true unless clearly qualitative.";
    case "step-by-step":
      return "Required: steps (3-5) with title and description — ordered actions for the brief.";
    case "comparison":
      return "Required: comparison with leftTitle, rightTitle, and exactly two items with 2-4 points each — semantically opposed sides for the brief.";
    case "promotional-banner":
      return "Required: headline, subtitle or supportingText, and a short CTA-friendly supporting line for the brief.";
    case "editorial-infographic":
      return "Required: supportingText plus keyPoints (3-4) expanding the brief.";
    case "feature-grid":
    case "list-announcement":
      return "Required: keyPoints (4-6) as scannable bullets for the brief.";
    default:
      return "";
  }
}
