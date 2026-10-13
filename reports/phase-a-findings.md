# Phase A — Read-only audit findings

**Date:** 2026-10-12  
**Backup:** `reports/backups/phase-a-20261012-212745/`

## Assessment PDF

`Gen AI_Creative Dev JD ShriGenesis.pdf` was **not found** in the repository workspace (0 PDF files). Requirements in this effort follow the user-provided assessment brief and prior `reports/final-assessment-audit.md`. **PDF wording remains UNVERIFIED** until the file is added to the repo.

## Verified artifact state (pre–Phase E full regen)

| Item | Finding |
|------|---------|
| Canonical manifest | `outputs/assessment/manifest.json` — **100 entries**, all `contentMode: unknown` (honest; per-entry AI not recovered) |
| Legacy alias | `outputs/manifest.json` synced with assessment |
| Phase-1 archive | `outputs-phase1-archive/` — 100 SVGs, all fallback in baseline manifest |
| SVGs on disk under `outputs/` | >100 files including targeted runs, probes, and vf-NNNN assessment paths |
| Stale execution report | Prior `execution-report.md` contradicted JSON — addressed via `npm run reports:sync` after verification |
| Contact sheet | Must be regenerated from assessment manifest (`npm run previews`) after any collection change |
| Groq 429 | Documented in `reports/ai-rate-limit-notes.md`; TPM limits on `openai/gpt-oss-20b` |

## Confirmed AI failure cause (historical)

HTTP **429** token-per-minute limits on Groq during rapid 100-design batch; 94 entries fell back with `fallbackReason` recorded (aggregate in old execution JSON). Per-file assignment for vf-NNNN was **not** recovered.

## Architecture fixes already in place (Phase B/D)

- Targeted batches → `outputs/runs/<id>/manifest.json` only  
- Assessment batches → `outputs/assessment/manifest.json`  
- Rate-limit retries with backoff (`packages/ai/src/rate-limit.ts`)  
- `OUTPUT_DIR` resolved from monorepo root  

## Stop gate

Full **100-design regeneration (Phase E)** was **not** executed in this session pending review of controlled verification (`npm run batch:verify` → `reports/ai-verify-batch.json`).
