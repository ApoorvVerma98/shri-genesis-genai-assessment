import { SPACING } from "@vector-forge/shared";
import { fitLines, lineHeight } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

export const renderFeatureGrid: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.lg;
  const features = brief.keyPoints?.slice(0, 6) ?? [];
  const cols = 2;
  const cardW = (width - pad * 2 - SPACING.md) / cols;
  const cardH = 156;
  const startY = 112;

  return `
    <rect width="100%" height="100%" fill="${palette.surface}" />
    <rect x="0" y="0" width="${width}" height="96" fill="${palette.primary}" />
    ${tspans(fitLines(brief.headline, width - pad * 2, typo.h2, 2), pad, 58, lineHeight(typo.h2), {
      "font-family": typo.fontFamily,
      "font-size": typo.h2,
      "font-weight": "700",
      fill: palette.background,
    })}
    ${features
      .map((f, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + SPACING.md);
        const y = startY + row * (cardH + SPACING.md);
        return `
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${style.cornerRadius}" fill="${palette.background}" stroke="${palette.border}" stroke-width="${style.strokeWidth}" />
        <rect x="${x}" y="${y}" width="8" height="${cardH}" rx="4" fill="${palette.accent}" />
        ${tspans(fitLines(f, cardW - 36, typo.body, 3), x + 24, y + 52, lineHeight(typo.body), {
          "font-family": typo.fontFamily,
          "font-size": typo.body,
          fill: palette.text,
        })}
      `;
      })
      .join("")}
  `;
};
