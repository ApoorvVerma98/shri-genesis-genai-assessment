# Phase E preflight report

**Date:** 2026-10-12  
**Full 100-design batch:** NOT executed (this document only).

## 1. Comparison layout + `normalizeAiPartial()`

| Item | Result |
|------|--------|
| Prior failure (`ai-verify-batch.json` entry `vf-mv5ftd3o-0005`) | `contentMode: fallback`; `fallbackReason` starts with `AI JSON schema` / `too_big` on `comparison.items` (Zod `.length(2)` — model returned ≠2 items) |
| `normalizeAiPartial()` | Trims `comparison.items` to 2 when **>2**; does not fix **<2** items |
| **Retest** | `npx tsx apps/api/src/cli/batch-comparison-retest.ts` → **2/2 AI**, run `mv5fy7un`, report `reports/comparison-layout-retest.json` |
| Assessment manifest after retest | Unchanged: **100 entries**, **100 unknown** |

**Verdict:** Fix is **effective for the retest** (genuine AI, no fallback). Residual risk if the model returns only 1 comparison item.

## 2. Rate limits and `AI_BATCH_DELAY_MS`

| Mechanism | Behavior |
|-----------|----------|
| Concurrency | **Sequential** (`pipeline.ts` loop); no parallel AI calls |
| Inter-call delay | `AI_BATCH_DELAY_MS` (default **0** if unset) after first design when AI configured |
| Per-request retries | `AI_MAX_RETRIES` default **4** → **5** total attempts; 429/502/503 retry with `Retry-After` + capped exponential backoff (`retryMaxMs` 60s) |
| Env inspected | `AI_PROVIDER=openai-compatible` present; **`AI_BATCH_DELAY_MS` not set in `.env`** |

**Verdict:** Retry/backoff is **bounded**. For 100 designs at 0ms delay, **Groq TPM 429 risk remains high** — set `AI_BATCH_DELAY_MS=3000` (or similar) before Phase E.

## 3. Canonical assessment collection

| Check | Result |
|-------|--------|
| Manifest entries | **100** (`outputs/assessment/manifest.json`) |
| Missing SVG paths | **0** |
| Probe files on disk | **2** (`ai-probe-*.svg`) — **not** in assessment manifest |
| Targeted run dirs | **3** under `outputs/runs/` — not overwritten by assessment batch |

**Backup procedure** (`reports/full-regeneration-workflow.md`): **manual** copy to `reports/backups/pre-regen-<timestamp>/` — **no automated backup script**. Run backup before Phase E.

## 4. Interrupted / partial batch and reporting

| Safeguard | Status |
|-----------|--------|
| Manifest write timing | Single write **after** full loop (`pipeline.ts`) — interrupt → **prior assessment manifest kept** |
| Per-entry provenance | `contentMode`, `aiAttempted`, `fallbackReason` set per design |
| `npm run batch` execution report | Written **only** when CLI completes `runBatch` — interrupt → **stale** `execution-report.json` possible |
| False “all AI” claim | Prevented: counts derived from entries; `unknown` preserved until regen |

**Verdict:** **Pass** for manifest integrity on interrupt; **caution** on execution report if process is killed mid-batch.

## 5. AI vs default fallback

With `AI_PROVIDER=openai-compatible` and API key configured, `factory.generate()` **calls the provider first** (`aiAttempted: true` on success or AI→fallback). Fallback without attempt only when provider is `fallback` or key missing.

## 6. CLI consistency (assessment collection)

| Command | Scope | Result |
|---------|--------|--------|
| `npm run validate:outputs` | `getManifestPath()` → assessment | **100 passed**, 0 failed |
| `npm run coverage:report` | assessment | **totalEntries: 100**, validationPassed: 100 |
| `npm run reports:sync` | assessment + `ai-verify-batch.json` | `execution-report.json` assessment block matches (100 generated, 0 ai, 100 unknown) |

**Note:** After `npm run batch`, `apps/api/src/cli/batch.ts` overwrites `execution-report.json` with a **different schema** than `reports:sync`. Use batch CLI output as post-regen source of truth, then optionally re-run `reports:sync` if unified format is desired.

## 7. Regeneration scope

- Assessment plan IDs: `vf-0001` … `vf-0100` (`buildTopicPlan`) — overwrites category `vf-NNNN.svg` paths only.
- Does **not** delete or update `outputs/runs/*` manifests or `vf-<runToken>-*.svg` files.
- Probe SVGs remain on disk unless manually excluded; they are **not** manifest entries.

## 8. Tests and build

- `npm test`: **44/44 passed** (17 files)
- `npm run build`: **success**

---

## Preflight verdict

| Area | Ready for Phase E? |
|------|-------------------|
| Comparison AI fix | **Yes** (retest 2/2) |
| Rate-limit handling code | **Yes** |
| `AI_BATCH_DELAY_MS` configured | **No** — configure before batch |
| 100 files + manifest | **Yes** |
| Automated pre-regen backup | **No** — manual step required |
| Tests/build | **Yes** |

**Approval recommended** for Phase E **after** setting `AI_BATCH_DELAY_MS` and completing a manual backup.

## Exact Phase E commands (do not run until approved)

```powershell
cd "E:\svg-generation assesment"
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$bak = "reports/backups/pre-regen-$ts"
New-Item -ItemType Directory -Force -Path $bak | Out-Null
Copy-Item outputs\assessment\manifest.json $bak\
Copy-Item outputs\manifest.json $bak\
Copy-Item reports\execution-report.json $bak\ -ErrorAction SilentlyContinue
Copy-Item reports\execution-report.md $bak\ -ErrorAction SilentlyContinue

# Ensure .env includes AI_BATCH_DELAY_MS=3000 (or 2000–4000)

npm run batch
npm run validate:outputs
npm run coverage:report
npm run previews
npm run reports:sync
```
