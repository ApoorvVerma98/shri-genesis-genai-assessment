import { SPACING } from "@vector-forge/shared";
import type { GenerationBrief } from "@vector-forge/shared";
import { escapeXml } from "../escape.js";
import { backgroundMotif } from "../motifs.js";
import { fitLines, fitLinesAutoScale, lineHeight, maxLinesInBox } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

function pickCtaLabel(brief: GenerationBrief): string {
  const support = brief.supportingText?.trim();
  if (support) {
    const first = support.split(/[.!?]/)[0]?.trim();
    if (first && first.length <= 48) return first;
    if (support.length <= 48) return support;
    return support.slice(0, 48).trim();
  }
  const sub = brief.subtitle?.trim();
  if (sub && sub.length <= 40) return sub;
  return "Get started";
}

export const renderPromotionalBanner: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.lg;
  const mainW = width - pad * 2 - 300;
  const headlineLines = fitLines(brief.headline, mainW, typo.display, 3);
  const subLines = brief.subtitle
    ? fitLines(brief.subtitle, mainW, typo.h3, 2)
    : [];
  const ctaLabel = pickCtaLabel(brief);
  const ctaBoxW = 176;
  const ctaFont = 15;
  const ctaLines = fitLines(ctaLabel, ctaBoxW - 16, ctaFont, 2, true, false);
  const ctaBlockH = ctaLines.length * lineHeight(ctaFont, 1.2);
  const ctaBtnH = Math.max(44, ctaBlockH + 20);
  const ctaBtnY = height - pad - ctaBtnH;
  const ctaTextY = ctaBtnY + (ctaBtnH - ctaBlockH) / 2 + ctaFont * 0.85;
  const headlineY = pad + typo.display * 0.9;
  const subY = headlineY + headlineLines.length * lineHeight(typo.display, 1.12) + 12;

  const sideX = width - pad - 280;
  const sideInnerX = sideX + 20;
  const sideW = 240;
  const sideTop = pad + 78;
  const sideBodyH = height - pad - sideTop - pad;
  const topicMaxLines = maxLinesInBox(typo.body, sideBodyH, 1.25);
  const topicFit = fitLinesAutoScale(brief.topic, sideW, typo.body, 14, topicMaxLines, true);

  return `
    <rect width="100%" height="100%" fill="${palette.background}" />
    ${backgroundMotif(width, height, palette, style)}
    <rect x="${pad}" y="${ctaBtnY}" width="${ctaBoxW}" height="${ctaBtnH}" rx="${style.cornerRadius}" fill="${palette.primary}" />
    ${tspans(ctaLines, pad + ctaBoxW / 2, ctaTextY, lineHeight(ctaFont, 1.2), {
      "text-anchor": "middle",
      "font-family": typo.fontFamily,
      "font-size": ctaFont,
      "font-weight": "600",
      fill: palette.background,
    })}
    ${tspans(headlineLines, pad, headlineY, lineHeight(typo.display, 1.12), {
      "font-family": typo.fontFamilyDisplay,
      "font-size": typo.display,
      "font-weight": "700",
      fill: palette.text,
    })}
    ${subLines.length ? tspans(subLines, pad, subY, lineHeight(typo.h3), {
      "font-family": typo.fontFamily,
      "font-size": typo.h3,
      fill: palette.textMuted,
    }) : ""}
    <rect x="${sideX}" y="${pad}" width="280" height="${height - pad * 2}" rx="${style.cornerRadius}" fill="${palette.surface}" stroke="${palette.border}" stroke-width="${style.strokeWidth}" />
    <text x="${sideInnerX}" y="${pad + 44}" font-family="${typo.fontFamily}" font-size="${typo.caption}" fill="${palette.accent}" font-weight="700" letter-spacing="1">${escapeXml(brief.category.toUpperCase())}</text>
    ${tspans(topicFit.lines, sideInnerX, sideTop, lineHeight(topicFit.fontSize, 1.25), {
      "font-family": typo.fontFamily,
      "font-size": topicFit.fontSize,
      fill: palette.text,
    })}
  `;
};
