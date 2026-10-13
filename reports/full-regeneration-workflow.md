# Controlled full assessment regeneration (do not run without approval)

## Preconditions

1. `reports/assessment-reconcile.json` documents the current 100-design collection.
2. `outputs-phase1-archive/` and `reports/backups/` remain untouched.
3. `.env` at repo root with `AI_PROVIDER`, `AI_API_KEY`, and tuned rate limits:
   - `AI_BATCH_DELAY_MS` (e.g. `2000`–`4000`)
   - `AI_MAX_RETRIES` (default `4`)
   - `AI_RETRY_BASE_MS` / `AI_RETRY_MAX_MS`

## Steps (after small-batch smoke passes)

1. Run automated backup: `npm run pre-regen-backup` (creates `reports/backups/pre-regen-<timestamp>/` with manifests, 100 SVGs, and reports).
2. Run legacy assessment batch only:
   ```bash
   npm run batch
   ```
   This writes `outputs/assessment/manifest.json` and syncs `outputs/manifest.json` (does **not** use targeted segments).
3. Validate:
   ```bash
   npm run validate:outputs
   ```
4. Reconcile counts: 100 entries, 0 missing paths, structural pass.
5. Regenerate previews:
   ```bash
   npm run previews
   ```
6. Update `reports/execution-report.json` via batch CLI side effect and rewrite human reports from the **same** manifest metrics.
7. Compare against backup; keep archive until reviewer sign-off.

## Rollback

Restore `outputs/assessment/manifest.json` and `outputs/manifest.json` from backup; SVG files on disk are additive unless batch overwrites same IDs (`vf-0001`…`vf-0100`).
