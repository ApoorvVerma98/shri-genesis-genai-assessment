import { SPACING } from "@vector-forge/shared";
import { escapeXml } from "../escape.js";
import { backgroundMotif } from "../motifs.js";
import { fitLines, lineHeight } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

export const renderMetrics: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.lg;
  const metrics = brief.metrics?.slice(0, 4) ?? [];
  const cols = 2;
  const cardW = (width - pad * 2 - SPACING.md) / cols;
  const cardH = 148;
  const top = pad + lineHeight(typo.h1) * 2 + 24;

  return `
    <rect width="100%" height="100%" fill="${palette.background}" />
    ${backgroundMotif(width, height, palette, style)}
    ${tspans(fitLines(brief.headline, width - pad * 2, typo.h1, 2), pad, pad + typo.h1, lineHeight(typo.h1), {
      "font-family": typo.fontFamilyDisplay,
      "font-size": typo.h1,
      "font-weight": "700",
      fill: palette.text,
    })}
    <text x="${pad}" y="${pad + lineHeight(typo.h1) + typo.h3}" font-family="${typo.fontFamily}" font-size="${typo.body}" fill="${palette.textMuted}">${escapeXml(brief.subtitle ?? "")}</text>
    ${metrics
      .map((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + SPACING.md);
        const y = top + row * (cardH + SPACING.md);
        const ill = m.illustrative ? "*" : "";
        return `
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${style.cornerRadius}" fill="${palette.surface}" stroke="${palette.border}" stroke-width="${style.strokeWidth}" />
        <text x="${x + 24}" y="${y + 56}" font-family="${typo.fontFamily}" font-size="44" font-weight="700" fill="${palette.primary}">${escapeXml(m.value)}${ill}</text>
        <text x="${x + 24}" y="${y + 92}" font-family="${typo.fontFamily}" font-size="${typo.body}" fill="${palette.text}">${escapeXml(m.label)}</text>
        ${m.note ? `<text x="${x + 24}" y="${y + 122}" font-family="${typo.fontFamily}" font-size="${typo.caption}" fill="${palette.textMuted}">${escapeXml(m.note)}</text>` : ""}
      `;
      })
      .join("")}
    <text x="${pad}" y="${height - pad}" font-family="${typo.fontFamily}" font-size="12" fill="${palette.textMuted}">* Illustrative metrics unless sourced</text>
  `;
};
