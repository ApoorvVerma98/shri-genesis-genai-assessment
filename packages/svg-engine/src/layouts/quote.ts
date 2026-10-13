import { SPACING } from "@vector-forge/shared";
import { escapeXml } from "../escape.js";
import { backgroundMotif } from "../motifs.js";
import { fitLines, lineHeight } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

export const renderQuote: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.xl;
  const quoteText = brief.quote?.text ?? brief.headline;
  const lines = fitLines(`"${quoteText}"`, width - pad * 2 - 40, typo.h2, 5);
  const attr = brief.quote?.attribution ?? brief.subtitle ?? brief.topic;
  const blockH = lines.length * lineHeight(typo.h2, 1.2);
  const startY = height / 2 - blockH / 2 + typo.h2;

  return `
    <rect width="100%" height="100%" fill="${palette.background}" />
    ${backgroundMotif(width, height, palette, style)}
    <text x="${pad}" y="${pad + 48}" font-family="${typo.fontFamilyDisplay}" font-size="96" fill="${palette.primary}" opacity="0.28">"</text>
    ${tspans(lines, pad + 16, startY, lineHeight(typo.h2, 1.2), {
      "font-family": typo.fontFamilyDisplay,
      "font-size": typo.h2,
      "font-style": "italic",
      fill: palette.text,
    })}
    <line x1="${pad}" y1="${height - pad - 56}" x2="${pad + 120}" y2="${height - pad - 56}" stroke="${palette.accent}" stroke-width="4" />
    <text x="${pad}" y="${height - pad - 20}" font-family="${typo.fontFamily}" font-size="${typo.body}" fill="${palette.textMuted}">— ${escapeXml(attr.slice(0, 72))}</text>
  `;
};
