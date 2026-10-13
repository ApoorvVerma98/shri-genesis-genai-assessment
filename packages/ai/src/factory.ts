import { GenerationBriefSchema, type GenerationBrief } from "@vector-forge/shared";
import type { TopicSeed } from "@vector-forge/shared";
import { validateAiContent } from "./content-relevance.js";
import { generateFallbackBrief } from "./fallback.js";
import { generateWithOllama } from "./ollama.js";
import {
  generateWithOpenAICompatible,
  mergeBrief,
  type AiGenerationResult,
} from "./openai-compatible.js";

export type ContentMode = "ai" | "fallback";

export interface ProviderStatus {
  provider: string;
  configured: boolean;
  model?: string;
  message: string;
  reachable?: boolean;
}

export interface GenerateResult {
  brief: GenerationBrief;
  mode: ContentMode;
  aiProvider?: string;
  aiModel?: string;
  aiAttempted: boolean;
  fallbackReason?: string;
}

export interface ContentGenerator {
  status(): ProviderStatus;
  probe(): Promise<ProviderStatus>;
  generate(seed: TopicSeed, id: string): Promise<GenerateResult>;
}

function envProvider(env: NodeJS.ProcessEnv) {
  const provider = (env.AI_PROVIDER ?? "fallback").toLowerCase();
  const apiKey = env.AI_API_KEY?.trim();
  const baseUrl = env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
  const model = env.AI_MODEL ?? "openai/gpt-oss-20b";
  const ollamaUrl = env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const ollamaModel = env.OLLAMA_MODEL ?? "llama3.2";
  const allowFallback = env.AI_ALLOW_FALLBACK !== "false";
  const strict = env.AI_STRICT === "true";
  return { provider, apiKey, baseUrl, model, ollamaUrl, ollamaModel, allowFallback, strict };
}

export function createContentGenerator(env: NodeJS.ProcessEnv = process.env): ContentGenerator {
  const cfg = envProvider(env);

  return {
    status(): ProviderStatus {
      if (cfg.provider === "openai-compatible") {
        if (!cfg.apiKey) {
          return {
            provider: "openai-compatible",
            configured: false,
            model: cfg.model,
            message:
              "AI_PROVIDER=openai-compatible but AI_API_KEY is missing. Ensure the monorepo root .env is loaded (not apps/api/.env).",
          };
        }
        return {
          provider: "openai-compatible",
          configured: true,
          model: cfg.model,
          message: "OpenAI-compatible API configured",
        };
      }
      if (cfg.provider === "ollama") {
        return {
          provider: "ollama",
          configured: true,
          model: cfg.ollamaModel,
          message: "Ollama provider selected (requires local server)",
        };
      }
      if (cfg.provider !== "fallback") {
        return {
          provider: cfg.provider,
          configured: false,
          message: `Unknown AI_PROVIDER "${cfg.provider}". Use openai-compatible, ollama, or fallback.`,
        };
      }
      return {
        provider: "fallback",
        configured: true,
        message:
          "Deterministic structured fallback (not AI). Set AI_PROVIDER and AI_API_KEY in the monorepo root .env.",
      };
    },

    async probe(): Promise<ProviderStatus> {
      const base = this.status();
      if (cfg.provider === "ollama") {
        try {
          const res = await fetch(`${cfg.ollamaUrl.replace(/\/$/, "")}/api/tags`, {
            signal: AbortSignal.timeout(4000),
          });
          return { ...base, reachable: res.ok, message: res.ok ? "Ollama reachable" : `Ollama HTTP ${res.status}` };
        } catch (e) {
          return {
            ...base,
            reachable: false,
            message: e instanceof Error ? e.message : "Ollama unreachable",
          };
        }
      }
      if (cfg.provider === "openai-compatible" && cfg.apiKey) {
        try {
          const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/models`, {
            headers: { Authorization: `Bearer ${cfg.apiKey}` },
            signal: AbortSignal.timeout(8000),
          });
          return {
            ...base,
            reachable: res.ok,
            message: res.ok ? "API reachable" : `API HTTP ${res.status}`,
          };
        } catch (e) {
          return {
            ...base,
            reachable: false,
            message: e instanceof Error ? e.message : "API unreachable",
          };
        }
      }
      return { ...base, reachable: false };
    },

    async generate(seed: TopicSeed, id: string): Promise<GenerateResult> {
      const tryAi = async (correction?: string): Promise<AiGenerationResult> => {
        if (cfg.provider === "openai-compatible" && cfg.apiKey) {
          const maxRetries = Number(env.AI_MAX_RETRIES ?? 4);
          return generateWithOpenAICompatible(
            seed,
            {
              baseUrl: cfg.baseUrl,
              apiKey: cfg.apiKey,
              model: cfg.model,
              timeoutMs: 45_000,
              maxRetries: Number.isFinite(maxRetries) ? maxRetries : 4,
              retryBaseMs: Number(env.AI_RETRY_BASE_MS ?? 1000),
              retryMaxMs: Number(env.AI_RETRY_MAX_MS ?? 60_000),
            },
            correction,
          );
        }
        if (cfg.provider === "ollama") {
          return generateWithOllama(
            seed,
            {
              baseUrl: cfg.ollamaUrl,
              model: cfg.ollamaModel,
              timeoutMs: 120_000,
            },
            correction,
          );
        }
        throw new Error("AI provider not configured");
      };

      const aiConfigured =
        (cfg.provider === "openai-compatible" && !!cfg.apiKey) || cfg.provider === "ollama";

      if (aiConfigured) {
        try {
          let ai = await tryAi();
          let contentIssues = validateAiContent(
            seed,
            ai.partial as import("./ai-output-schema.js").AiContentPartial,
          );
          if (contentIssues.length > 0) {
            const correction = contentIssues.join("; ");
            ai = await tryAi(correction);
            contentIssues = validateAiContent(
              seed,
              ai.partial as import("./ai-output-schema.js").AiContentPartial,
            );
            if (contentIssues.length > 0) {
              throw new Error(`AI content relevance: ${contentIssues.join("; ")}`);
            }
          }
          const brief = mergeBrief(seed, ai.partial, id);
          return {
            brief,
            mode: "ai",
            aiProvider: ai.provider,
            aiModel: ai.model,
            aiAttempted: true,
          };
        } catch (e) {
          const reason = e instanceof Error ? e.message : String(e);
          if (cfg.strict) throw new Error(`AI_STRICT: ${reason}`);
          if (!cfg.allowFallback) {
            throw new Error(`AI failed and AI_ALLOW_FALLBACK=false: ${reason}`);
          }
          const fb = generateFallbackBrief(seed);
          const brief = GenerationBriefSchema.parse({
            id,
            canvas: { width: 1200, height: 630 },
            ...fb.partial,
          });
          return {
            brief,
            mode: "fallback",
            aiProvider: cfg.provider,
            aiModel: cfg.provider === "ollama" ? cfg.ollamaModel : cfg.model,
            aiAttempted: true,
            fallbackReason: reason,
          };
        }
      }

      const fb = generateFallbackBrief(seed);
      const brief = GenerationBriefSchema.parse({
        id,
        canvas: { width: 1200, height: 630 },
        ...fb.partial,
      });
      return {
        brief,
        mode: "fallback",
        aiProvider: "fallback",
        aiAttempted: false,
      };
    },
  };
}
