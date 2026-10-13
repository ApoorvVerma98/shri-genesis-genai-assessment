# Canonical output directory

## Single source of truth

Both the **CLI** (`apps/api/src/paths.ts` → `resolveOutputDir()`) and the **web API** import the same helper. With default env (`OUTPUT_DIR=outputs` or unset), all generated assets live under:

`<repository-root>/outputs/`

| Artifact | Path |
|----------|------|
| Assessment manifest | `outputs/assessment/manifest.json` |
| Legacy alias (synced on assessment writes) | `outputs/manifest.json` |
| Per-design SVGs | `outputs/<category>/vf-*.svg` |
| Targeted run manifests | `outputs/runs/<batchRunId>/manifest.json` |
| Previews / contact sheet | `outputs/previews/` |

`OUTPUT_DIR` may be absolute or relative to the **monorepo root**, not `apps/api` cwd.

## Legacy / stale copies

`apps/api/outputs/` is **not** canonical. It can appear when the API was started with a cwd-relative `OUTPUT_DIR` or from older runs. A stale assessment manifest there may disagree with `outputs/assessment/manifest.json` (see `apps/api/outputs/README-STALE-MANIFEST.md` if present).

**Do not** infer per-design AI vs fallback provenance from aggregate counts or stale manifests. Use each manifest entry’s `contentMode`, `aiAttempted`, and `fallbackReason` only.

## Assessment regeneration (Phase E)

Assessment batches (`{ count, seed }`) generate under `outputs/staging/<runId>/` first. The canonical manifest and SVGs are updated only after all promotion gates pass (`batch-gates.ts` → `promoteAssessmentStaging`). Failed or interrupted runs leave the prior canonical collection intact.

## Reports vs manifests

- `reports/execution-run.json` — last batch lifecycle (`in_progress` / `completed` / `failed`).
- `reports/execution-report.json` — assessment metrics; updated only after a **completed** assessment batch.
- `reports/batch-progress.json` — live per-design progress during CLI `npm run batch`.
