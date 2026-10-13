# Phase 2 — Audit (confirmed defects addressed)

## Baseline preserved

- `reports/baseline-phase1/manifest.json` (+ execution reports)
- `outputs-phase1-archive/` (100 SVGs from phase 1)

## Defects found (priority)

| Impact | Issue | Status |
|--------|--------|--------|
| Critical | No AI credentials / Ollama; all outputs `fallback` | Documented; `npm run ai:probe` + Groq/Ollama setup in README |
| Critical | Silent AI failure could imply success | Fixed: `aiAttempted`, `fallbackReason`; mode stays `fallback` |
| High | Repetitive fallback copy (`: a focused guide`, generic key points) | Fixed: `fallback-content.ts` category templates |
| High | CTA/text overflow in promotional banner | Fixed: `typography.ts` truncate + `fitLines` |
| High | Small body type (16px) | Fixed: 18px body, adjusted scale |
| Medium | Layout/design type mismatch | Improved `buildTopicPlan` preferred layouts |
| Medium | Weak duplicate/near-dup reporting | Extended validation CLI + manifest `headline` |
| Medium | Default Groq model deprecated | `.env.example` → `openai/gpt-oss-20b` |
| Low | Unescaped raw text in SVG | Fixed across layouts via `escapeXml` / `tspans` |

## AI adapters verified

- **Unit tests** mock HTTP for OpenAI-compatible JSON + Zod schema.
- **Live probe** not run (no `.env`); `ai:probe` exits code 2 when provider is `fallback`.

## Visual inspection

- Manual: open `outputs/previews/contact-sheet.html` (automated screenshot not run in this session).
- Heuristic validation only; overlap/clipping not geometrically proven.
