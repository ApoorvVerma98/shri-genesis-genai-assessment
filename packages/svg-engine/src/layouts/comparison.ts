import { SPACING } from "@vector-forge/shared";
import { getResolvedComparisonColumns } from "@vector-forge/validation";
import { escapeXml } from "../escape.js";
import { fitLines, lineHeight } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

export const renderComparison: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.lg;
  const resolved = getResolvedComparisonColumns(brief);
  const leftTitle = resolved?.left.title ?? brief.comparison?.leftTitle ?? "Option A";
  const rightTitle = resolved?.right.title ?? brief.comparison?.rightTitle ?? "Option B";
  const leftPoints = resolved?.left.points ?? [];
  const rightPoints = resolved?.right.points ?? [];

  const colW = (width - pad * 3) / 2;
  const top = pad + lineHeight(typo.h1) + 28;

  return `
    <rect width="100%" height="100%" fill="${palette.background}" />
    ${tspans(fitLines(brief.headline, width - pad * 2, typo.h1, 2), pad, pad + typo.h1, lineHeight(typo.h1), {
      "font-family": typo.fontFamilyDisplay,
      "font-size": typo.h1,
      "font-weight": "700",
      fill: palette.text,
    })}
    <rect x="${pad}" y="${top}" width="${colW}" height="${height - top - pad}" rx="${style.cornerRadius}" fill="${palette.surface}" stroke="${palette.primary}" stroke-width="3" />
    <rect x="${pad * 2 + colW}" y="${top}" width="${colW}" height="${height - top - pad}" rx="${style.cornerRadius}" fill="${palette.surface}" stroke="${palette.secondary}" stroke-width="3" />
    <text x="${pad + colW / 2}" y="${top + 44}" text-anchor="middle" font-family="${typo.fontFamily}" font-size="${typo.h2}" font-weight="700" fill="${palette.primary}">${escapeXml(leftTitle)}</text>
    <text x="${pad * 2 + colW + colW / 2}" y="${top + 44}" text-anchor="middle" font-family="${typo.fontFamily}" font-size="${typo.h2}" font-weight="700" fill="${palette.secondary}">${escapeXml(rightTitle)}</text>
    ${leftPoints
      .map(
        (p, i) => `
      <circle cx="${pad + 28}" cy="${top + 88 + i * 52}" r="6" fill="${palette.primary}" />
      ${tspans(fitLines(p, colW - 64, typo.body, 2, false, false), pad + 48, top + 94 + i * 52, lineHeight(typo.body), {
        "font-family": typo.fontFamily,
        "font-size": typo.body,
        fill: palette.text,
      })}
    `,
      )
      .join("")}
    ${rightPoints
      .map(
        (p, i) => `
      <circle cx="${pad * 2 + colW + 28}" cy="${top + 88 + i * 52}" r="6" fill="${palette.secondary}" />
      ${tspans(fitLines(p, colW - 64, typo.body, 2, false, false), pad * 2 + colW + 48, top + 94 + i * 52, lineHeight(typo.body), {
        "font-family": typo.fontFamily,
        "font-size": typo.body,
        fill: palette.text,
      })}
    `,
      )
      .join("")}
  `;
};
