import type { GenerationBrief } from "@vector-forge/shared";
import type { TopicSeed } from "@vector-forge/shared";
import { AiContentPartialSchema } from "./ai-output-schema.js";
import { buildContentPrompt } from "./prompt.js";
import type { AiGenerationResult } from "./openai-compatible.js";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export async function generateWithOllama(
  seed: TopicSeed,
  config: OllamaConfig,
  correction?: string,
): Promise<AiGenerationResult> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/api/chat`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: buildContentPrompt(seed, correction) },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) throw new Error("Empty Ollama response");
    const raw = JSON.parse(content) as unknown;
    const parsed = AiContentPartialSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Ollama JSON schema: ${parsed.error.message.slice(0, 200)}`);
    }
    return {
      mode: "ai",
      provider: "ollama",
      model: config.model,
      partial: parsed.data as Partial<GenerationBrief>,
    };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}
