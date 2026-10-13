import { SPACING } from "@vector-forge/shared";
import { escapeXml } from "../escape.js";
import { fitLines, lineHeight } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

export const renderListAnnouncement: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.lg;
  const items = brief.keyPoints?.slice(0, 6) ?? [];
  const badge = brief.designType === "announcement" ? "ANNOUNCEMENT" : brief.category.toUpperCase();
  const listTop = 148;

  return `
    <rect width="100%" height="100%" fill="${palette.background}" />
    <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="104" rx="${style.cornerRadius}" fill="${palette.primary}" />
    <text x="${pad + 24}" y="${pad + 36}" font-family="${typo.fontFamily}" font-size="${typo.caption}" font-weight="700" letter-spacing="2" fill="${palette.background}">${escapeXml(badge)}</text>
    ${tspans(fitLines(brief.headline, width - pad * 2 - 48, typo.h2, 2), pad + 24, pad + 72, lineHeight(typo.h2), {
      "font-family": typo.fontFamily,
      "font-size": typo.h2,
      "font-weight": "700",
      fill: palette.background,
    })}
    <g transform="translate(${pad}, ${listTop})">
      ${items
        .map(
          (item, i) => `
        <rect y="${i * 68}" width="${width - pad * 2}" height="58" rx="${style.cornerRadius / 2}" fill="${palette.surface}" stroke="${palette.border}" stroke-width="1" />
        <circle cx="28" cy="${i * 68 + 29}" r="8" fill="${palette.accent}" />
        ${tspans(fitLines(item, width - pad * 2 - 72, typo.body, 2), 52, i * 68 + 36, lineHeight(typo.body), {
          "font-family": typo.fontFamily,
          "font-size": typo.body,
          fill: palette.text,
        })}
      `,
        )
        .join("")}
    </g>
    ${brief.subtitle ? `<text x="${pad}" y="${height - pad}" font-family="${typo.fontFamily}" font-size="${typo.caption}" fill="${palette.textMuted}">${escapeXml(brief.subtitle.slice(0, 100))}</text>` : ""}
  `;
};
