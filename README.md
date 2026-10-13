# VectorForge

AI-powered SVG banner and infographic generation engine (technical assessment project).

Generate ~100 original vector designs across categories and layout families, with validation, manifests, previews, and an optional React studio.

## Features

- Structured content generation (AI or explicit fallback)
- Eight distinct SVG layout families
- Design tokens (palettes, typography, motifs)
- Batch CLI + JSON manifest
- SVG validation, duplicate checks, contact sheet
- Express API + Assessment Studio (Generate Studio · Design Library · Assessment & Quality)

## Architecture

```
apps/web          React studio
apps/api          Express API + CLI
packages/shared   Zod schemas, topics, tokens
packages/ai       Provider abstraction
packages/svg-engine  Layout renderers
packages/validation  XML/SVG QA
outputs/          Generated SVGs + manifest
reports/          Technical + execution reports
```

## Prerequisites

- Node.js 20+ (tested on 22)
- npm 10+

## Installation

```bash
cd "E:\svg-generation assesment"
npm install
npm run build
```

Copy environment template into the **repository root** (not `apps/api/`):

```bash
copy .env.example .env
```

CLI and API load `.env` from the monorepo root (`vector-forge` `package.json`), even when npm workspace scripts run with `cwd` set to `apps/api`. Existing shell environment variables take precedence over `.env` (conflicts are listed when `VF_ENV_DEBUG=1`).

## AI configuration (zero-budget options)

| Mode | Setup |
|------|--------|
| **fallback** (default) | No keys; deterministic structured copy labeled `fallback` |
| **Groq / OpenRouter** | `AI_PROVIDER=openai-compatible`, set `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` |
| **Ollama** | Install Ollama locally, `AI_PROVIDER=ollama` |

The UI and manifest always show `contentMode` (`ai` vs `fallback`).

### Batch request format

Legacy (unchanged):

```json
{ "count": 100, "seed": 42 }
```

Targeted distribution:

```json
{
  "segments": [
    { "category": "technology", "layoutFamily": "promotional-banner", "count": 50 },
    { "category": "healthcare", "layoutFamily": "editorial-infographic", "count": 50 }
  ],
  "seed": 42
}
```

Total per request: 1–200 designs. If `count` is sent with `segments`, it must equal the segment sum.

## Commands

| Task | Command |
|------|---------|
| Dev (API + UI) | `npm run dev` |
| API only | `npm run dev -w @vector-forge/api` |
| UI only | `npm run dev -w @vector-forge/web` |
| Tests | `npm test` |
| One design | `npm run generate:one` |
| Batch (~100) | `npm run batch` |
| Targeted batch (API) | `POST /api/batch` with `segments` (see below) |
| Validate outputs | `npm run validate:outputs` |
| Contact sheet | `npm run previews` |
| Test AI provider (1 design) | `npm run ai:probe` |
| Reconcile 100-design manifest | `npm run reconcile:assessment` |
| AI smoke batch (3 designs, targeted) | `npm run batch:smoke` |
| Controlled quality probes | `npm run controlled:quality` |
| Pre-regen backup (before Phase E) | `npm run pre-regen-backup` |
| Assessment traceability audit | `npm run assessment:audit` |

Phase 1 baseline is archived under `reports/baseline-phase1/` and `outputs-phase1-archive/`.

## Outputs

- SVGs: `outputs/<category>/<id>.svg`
- Assessment manifest: `outputs/assessment/manifest.json` (legacy alias: `outputs/manifest.json`)
- Targeted run manifests: `outputs/runs/<batchRunId>/manifest.json`
- Previews: `outputs/previews/contact-sheet.html`
- Reports: `reports/technical-report.md`, `reports/execution-report.json`

## Known limitations

- Fallback mode is not AI-generated content.
- Text wrapping is heuristic.
- Visual overlap detection is not geometric.

## Troubleshooting

- **AI errors**: Confirm `.env` provider settings; failures fall back with `contentMode: fallback`.
- **Empty gallery**: Run `npm run batch` before opening the UI.
- **Port conflicts**: Set `API_PORT` in `.env`.
