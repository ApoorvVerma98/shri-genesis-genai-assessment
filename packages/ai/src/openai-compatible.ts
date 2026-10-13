import { GenerationBriefSchema, type GenerationBrief } from "@vector-forge/shared";
import type { TopicSeed } from "@vector-forge/shared";
import { AiContentPartialSchema } from "./ai-output-schema.js";
import { buildContentPrompt } from "./prompt.js";
import {
  classifyHttpFailure,
  computeBackoffMs,
  formatAiHttpError,
  sleep,
} from "./rate-limit.js";

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Inclusive extra attempts after the first try (total tries = maxRetries + 1). */
  maxRetries: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
}

export interface AiGenerationResult {
  mode: "ai";
  provider: string;
  model: string;
  partial: Partial<GenerationBrief>;
}

/** Coerce common model mistakes before Zod validation (does not invent content). */
export function normalizeAiPartial(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const o = { ...raw } as Record<string, unknown>;
  if (o.comparison && typeof o.comparison === "object" && o.comparison !== null) {
    const c = o.comparison as { items?: unknown[] };
    if (Array.isArray(c.items) && c.items.length > 2) {
      o.comparison = { ...c, items: c.items.slice(0, 2) };
    }
  }
  if (Array.isArray(o.keyPoints) && o.keyPoints.length > 8) {
    o.keyPoints = o.keyPoints.slice(0, 8);
  }
  return o;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function generateWithOpenAICompatible(
  seed: TopicSeed,
  config: OpenAICompatibleConfig,
  correction?: string,
): Promise<AiGenerationResult> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  let lastError: Error | undefined;
  const retryBaseMs = config.retryBaseMs ?? 1000;
  const retryMaxMs = config.retryMaxMs ?? 60_000;
  const maxAttempts = config.maxRetries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.7,
          messages: [
            { role: "system", content: "You output only JSON for structured design briefs." },
            { role: "user", content: buildContentPrompt(seed, correction) },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const body = await res.text();
        const decision = classifyHttpFailure(res.status, body, res.headers);
        const msg = formatAiHttpError(res.status, body, decision, attempt, maxAttempts);
        const err = new Error(msg);
        lastError = err;
        if (decision.retryable && attempt < maxAttempts - 1) {
          const wait = computeBackoffMs(attempt, decision.retryAfterMs, retryBaseMs, retryMaxMs);
          await sleep(wait);
          continue;
        }
        throw err;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty AI response");
      const raw = normalizeAiPartial(extractJson(content));
      const parsed = AiContentPartialSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`AI JSON schema: ${parsed.error.message.slice(0, 200)}`);
      }
      return {
        mode: "ai",
        provider: "openai-compatible",
        model: config.model,
        partial: parsed.data as Partial<GenerationBrief>,
      };
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        lastError = new Error("AI request timed out");
      } else {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
      const retryable =
        lastError.message.includes("AI HTTP 429") ||
        lastError.message.includes("AI HTTP 503") ||
        lastError.message.includes("AI HTTP 502") ||
        lastError.message.includes("AI request timed out");
      if (retryable && attempt < maxAttempts - 1) {
        const wait = computeBackoffMs(attempt, 2000, retryBaseMs, retryMaxMs);
        await sleep(wait);
        continue;
      }
      if (attempt === maxAttempts - 1) break;
      if (!retryable) break;
    }
  }
  throw lastError ?? new Error("AI generation failed");
}

export function mergeBrief(
  seed: TopicSeed,
  partial: Partial<GenerationBrief>,
  id: string,
): GenerationBrief {
  const merged = {
    id,
    canvas: { width: 1200, height: 630 },
    headline: partial.headline ?? seed.topic,
    ...partial,
    category: seed.category,
    topic: seed.topic,
    designType: seed.designType,
    tone: seed.tone,
    targetAudience: seed.targetAudience,
    layoutFamily: seed.layoutFamily,
  };
  return GenerationBriefSchema.parse(merged);
}
