# Groq HTTP 429 — investigation notes (P0)

## Observed failure (from preserved targeted manifest backup)

- **Status:** HTTP 429  
- **Model:** `openai/gpt-oss-20b`  
- **Body pattern:** TPM rate limit (`Limit 8000`, high `Used`, request exceeded remaining tokens)  
- **Recorded in:** `outputs/runs/mv5ekfwi/manifest.json` entry `fallbackReason` (backup at `reports/backups/pre-p0-20261012-211502/manifest.json`)

## Prior batch behavior

- **Concurrency:** Sequential (`pipeline.ts` loop); optional `AI_BATCH_DELAY_MS` between calls after the first.  
- **Retries:** Previously `maxRetries: 2` with **no backoff** on 429 → rapid fallback.  
- **Headers:** Groq may send `retry-after`; not previously honored.

## Changes implemented

- `packages/ai/src/rate-limit.ts` — classifies 429/502/503, parses `Retry-After`, exponential backoff + jitter.  
- `openai-compatible.ts` — waits before retry; error strings include rate-limit hints (no secrets).  
- `AI_MAX_RETRIES` (default 4), `AI_RETRY_BASE_MS`, `AI_RETRY_MAX_MS` in `.env.example`.  
- Fallback still sets `contentMode: fallback` with `aiAttempted: true`; never `ai`.

## Smoke verification (2026-10-12)

- `npm run batch:smoke` → **3/3 AI success**, 0 fallback (`reports/ai-smoke-batch.json`).  
- Full 100-design batch not run (awaiting approval per `reports/full-regeneration-workflow.md`).
