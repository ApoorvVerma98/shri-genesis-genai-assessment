# VectorForge — Technical Report

## 1. Solution overview

VectorForge is a TypeScript monorepo that plans design topics, requests **structured JSON briefs** from an AI provider (or explicit fallback), renders **original SVG** via eight layout families, validates outputs, and exposes a React studio plus Express API.

**Canonical assessment collection:** `outputs/assessment/manifest.json` (100 designs).  
**Targeted sessions:** `outputs/runs/<batchRunId>/manifest.json` (do not replace assessment).

## 2. Technology stack

- TypeScript, React + Vite (`apps/web`), Express (`apps/api`)
- Zod schemas (`packages/shared`)
- `@vector-forge/ai` — Groq/OpenAI-compatible, Ollama, fallback
- `@vector-forge/svg-engine` — layout renderers
- `@vector-forge/validation` — XML/SVG structural checks
- Vitest + Supertest

## 3. AI models, providers, and APIs

- **Provider:** `AI_PROVIDER=openai-compatible` with Groq (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL=openai/gpt-oss-20b`).
- **Flow:** Chat completions → JSON only → `AiContentPartialSchema` → merge with `TopicSeed` → `GenerationBriefSchema` → `renderSvg()` (model never emits raw SVG).
- **Rate limits:** HTTP 429 TPM on Groq documented in `reports/ai-rate-limit-notes.md`. Retries honor `Retry-After`, exponential backoff (`AI_MAX_RETRIES`, `AI_RETRY_*`, `AI_BATCH_DELAY_MS`).
- **Provenance:** `contentMode` (`ai` | `fallback` | `unknown`), `aiAttempted`, `fallbackReason` on each manifest entry.

**Controlled verification (2026-10-12):** `npm run batch:verify` → **7/8 AI success** (`reports/ai-verify-batch.json`). One fallback due to comparison JSON shape (normalization added for excess comparison items).

**Assessment collection:** Per-entry AI/fallback for existing `vf-NNNN` files is **`unknown`** until a full approved regeneration; see `aggregateProvenanceNote` in assessment manifest.

## 4. What the model vs engine generate

| Layer | Responsibility |
|-------|----------------|
| **Model** | Headlines, subtitles, body copy, key points, steps, metrics labels, quotes, comparison text, motifs (JSON fields) |
| **Engine** | Layout geometry, palettes, typography scale, SVG paths, escaping, canvas 1200×630 |
| **Fallback** | Deterministic category templates (`fallback-content.ts`) — always labeled `fallback` |

## 5. Layout families

Eight families: promotional-banner, editorial-infographic, metrics-dashboard, step-by-step, comparison, feature-grid, quote-banner, list-announcement. Each maps to a dedicated renderer in `packages/svg-engine`.

## 6. SVG safety and validation

Structural parse, viewBox/dimensions, unsafe pattern rejection, brief rules, content/structure hashes, heuristic near-duplicate detection. Assessment run: **100/100 passed** (`reports/validation-summary.json`).

## 7. Originality and licensing

Layouts and motifs authored in code; system font stacks only. npm dependencies per package licenses. No claim of copyright clearance on AI text.

## 8. Testing

Vitest suite includes AI parse/retry, manifest isolation, comparison semantics, promotional CTA fit, and API validation. Run: `npm test`.

## 9. Known limitations

- Assessment vf-NNNN provenance unknown until full regeneration.
- Text wrap is character-heuristic; overlap not geometrically proven.
- Groq free tier TPM may require delay between batch calls.
- Assessment specification: `docs/Gen AI_Creative Dev JD ShriGenesis.pdf`.
- Assessment Studio UI: three primary pages (Generate Studio, Design Library, Assessment & Quality).

## 10. Next step (approved regeneration)

```bash
# After tuning .env (AI_BATCH_DELAY_MS=3000 recommended)
npm run batch
npm run validate:outputs
npm run previews
npm run reports:sync
```

See `reports/full-regeneration-workflow.md`.
