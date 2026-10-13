# VectorForge

**VectorForge** is an AI-powered SVG banner and infographic generation engine that transforms structured briefs into vector designs using LLM-generated content or an explicit deterministic fallback. It combines layout-aware SVG rendering, validation, manifest tracking, and a React Assessment Studio for generation, gallery browsing, and quality review.

Built for the Shri Genesis Gen AI Creative Developer assessment.

## Content provenance

Every generated entry records **`contentMode`** in the manifest and UI:

| Mode | Meaning |
|------|---------|
| **`ai`** | Copy came from the configured LLM provider for that run. |
| **`fallback`** | Deterministic structured copy when AI is off or fails—**not** AI-generated. |
| **`unknown`** | Per-entry AI vs fallback could not be resolved (see canonical note below). |

The **canonical assessment collection** (`vf-0001`…`vf-0100` in `outputs/assessment/manifest.json`) ships with the repo for review. **All 100 canonical entries currently have `contentMode: "unknown"`.** Their individual AI-versus-fallback provenance could not be established during manifest reconciliation, and aggregate batch metrics in `reports/` are not assigned to individual IDs. New runs and single-design generation label `ai` versus `fallback` when the pipeline can establish the generation path.

Phase 1 baseline **reports** (all fallback in that snapshot) live under `reports/baseline-phase1/`. A separate `outputs-phase1-archive/` folder is **gitignored** and may exist only on a local machine—it is **not** part of a fresh clone from GitHub.

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
git clone https://github.com/ApoorvVerma98/shri-genesis-genai-assessment.git
cd shri-genesis-genai-assessment
npm install
npm run build
```

Copy environment template into the **repository root** (not `apps/api/`):

```bash
cp .env.example .env
```

On Windows (Command Prompt): `copy .env.example .env`

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

## Outputs

- SVGs: `outputs/<category>/<id>.svg`
- Assessment manifest: `outputs/assessment/manifest.json` (legacy alias: `outputs/manifest.json`)
- Targeted run manifests: `outputs/runs/<batchRunId>/manifest.json`
- Previews: `outputs/previews/contact-sheet.html`
- Reports: `reports/technical-report.md`, `reports/execution-report.json`
- Phase 1 baseline (reports + manifest snapshot): `reports/baseline-phase1/`

## Known limitations

- Fallback mode is not AI-generated content.
- Text wrapping is heuristic.
- Visual overlap detection is not geometric.
- Canonical per-entry provenance may be `unknown` until a full regen with consistent manifest metadata.

## Troubleshooting

- **AI errors**: Confirm `.env` provider settings; failures fall back with `contentMode: fallback`.
- **Empty gallery**: Ensure `outputs/assessment/manifest.json` and referenced SVGs exist (they are tracked in this repo); otherwise run `npm run batch` or restore from your backup.
- **Port conflicts**: Set `API_PORT` in `.env`.
