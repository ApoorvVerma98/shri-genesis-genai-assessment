import { SPACING } from "@vector-forge/shared";
import { escapeXml } from "../escape.js";
import { fitLines, lineHeight } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

export const renderSteps: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.lg;
  const steps = brief.steps?.slice(0, 4) ?? [];
  const stepW = (width - pad * 2 - SPACING.sm * Math.max(steps.length - 1, 0)) / Math.max(steps.length, 1);
  const headerBottom = pad + lineHeight(typo.h1) + 36;

  return `
    <rect width="100%" height="100%" fill="${palette.background}" />
    ${tspans(fitLines(brief.headline, width - pad * 2, typo.h1, 2), pad, pad + typo.h1, lineHeight(typo.h1), {
      "font-family": typo.fontFamilyDisplay,
      "font-size": typo.h1,
      "font-weight": "700",
      fill: palette.text,
    })}
    <line x1="${pad}" y1="${headerBottom}" x2="${width - pad}" y2="${headerBottom}" stroke="${palette.border}" stroke-width="2" />
    <g transform="translate(0, ${headerBottom + 24})">
      ${steps
        .map((step, i) => {
          const x = pad + i * (stepW + SPACING.sm);
          const boxH = height - headerBottom - pad - 48;
          return `
          <rect x="${x}" y="0" width="${stepW}" height="${boxH}" rx="${style.cornerRadius}" fill="${palette.surface}" stroke="${palette.primary}" stroke-width="${i === 0 ? 3 : style.strokeWidth}" />
          <circle cx="${x + stepW / 2}" cy="40" r="24" fill="${palette.primary}" />
          <text x="${x + stepW / 2}" y="48" text-anchor="middle" font-family="${typo.fontFamily}" font-size="20" font-weight="700" fill="${palette.background}">${i + 1}</text>
          <text x="${x + 16}" y="92" font-family="${typo.fontFamily}" font-size="${typo.h3}" font-weight="600" fill="${palette.text}">${escapeXml(step.title)}</text>
          ${tspans(fitLines(step.description, stepW - 32, typo.body, 5), x + 16, 124, lineHeight(typo.body), {
            "font-family": typo.fontFamily,
            "font-size": typo.body,
            fill: palette.textMuted,
          })}
        `;
        })
        .join("")}
    </g>
  `;
};
