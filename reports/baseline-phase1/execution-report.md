# VectorForge — Execution Report

Measured run: `npm run batch` on 2026-10-12 (local).

| Metric | Value |
|--------|------:|
| Requested designs | 100 |
| Attempted | 100 |
| Files written | 100 |
| Validation passed | 100 |
| Validation failed | 0 |
| Generation failures | 0 |
| Total duration | 1,304 ms |
| Average per design | ~13 ms |

## AI usage

| | |
|--|--|
| Provider active | `fallback` (deterministic structured content) |
| AI-generated entries | 0 |
| Fallback entries | 100 |
| Models called | None (no `AI_API_KEY` / Ollama in environment) |

To enable genuine AI generation: copy `.env.example` to `.env`, set `AI_PROVIDER=openai-compatible` and a free-tier key (e.g. Groq), or run Ollama locally with `AI_PROVIDER=ollama`.

## Post-batch validation (`npm run validate:outputs`)

- Structural re-check passed: 100
- Exact duplicate groups: 0
- Near-duplicate pairs (heuristic): 0

## Artifacts

- Manifest: `outputs/manifest.json`
- SVGs: `outputs/<category>/vf-*.svg` (100 files)
- Contact sheet: `outputs/previews/contact-sheet.html`
- Machine report: `reports/execution-report.json`

## Known limitations

- All copy in this run is fallback-labeled, not model-generated.
- Text layout uses character-based wrapping estimates.
