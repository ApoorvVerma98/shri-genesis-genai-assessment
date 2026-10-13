# Visual QA report

**Collection:** `outputs/assessment/manifest.json` (100 designs)  
**Generated:** 2026-10-12

## Automated checks (verified)

| Check | Scope | Result |
|-------|--------|--------|
| `validateSvgStructure` | Assessment manifest entries (100) | **100 passed** (`npm run validate:outputs`) |
| Exact duplicate file hashes | Assessment paths | **0 groups** (from validation CLI) |
| Contact sheet | Regenerated from assessment manifest | `outputs/previews/contact-sheet.html` |

## Heuristic / manual (not proof)

- **Text truncation (ellipsis):** `detectSvgTextTruncation` flags `…` in rendered SVG (visual heuristic, separate from XML structure). Promotional CTA uses multi-line `fitLines` instead of hard character caps.
- **Overlap/clipping:** Not geometrically verified; typography uses character-based wrapping (`packages/svg-engine/src/typography.ts`).
- **Contrast:** Palette contrast rules in `validatePaletteContrast` at generation time.
- **Layout variety:** 8 layout families represented in assessment manifest (see `reports/category-coverage.json` → `layouts`).

## Controlled AI sample (visual spot-check recommended)

Eight-design verification run `mv5ftd3o` (`reports/ai-verify-batch.json`) spans 8 layout families with distinct SVG structure. Manual browser review of:

- `technology/vf-mv5ftd3o-0001.svg` (promotional-banner)
- `education/vf-mv5ftd3o-0002.svg` (editorial-infographic)
- `finance/vf-mv5ftd3o-0003.svg` (metrics-dashboard)

…recommended before submission; not automated in CI.

## Known limitations

- Assessment vf-NNNN files have **unknown** per-entry AI provenance until full regeneration.
- One verify-run fallback (marketing/comparison) was due to strict comparison schema; normalization added for excess comparison items.

## Uncertainty

Subjective “professional polish” and originality vs. third-party designs require human review; this report does not certify copyright clearance.
