import { SPACING } from "@vector-forge/shared";
import { escapeXml } from "../escape.js";
import { categoryIcon } from "../motifs.js";
import {
  EDITORIAL_TILE_TEXT_INSET_X,
  EDITORIAL_TILE_TEXT_OFFSET_Y,
  editorialColumnWidth,
  fitEditorialKeyPointInTile,
} from "./editorial-tile-fit.js";
import { fitLines, lineHeight } from "../typography.js";
import { tspans } from "../text.js";
import type { LayoutRenderer } from "./types.js";

const TILE_ROW_STEP = 108;

export const renderEditorial: LayoutRenderer = ({ brief, palette, style, typo }) => {
  const { width, height } = brief.canvas;
  const pad = SPACING.lg;
  const colW = editorialColumnWidth(width);
  const body = brief.supportingText ?? "";
  const bodyLines = fitLines(body, colW - 48, typo.body, 7, false, false);
  const points = brief.keyPoints?.slice(0, 4) ?? [];

  return `
    <rect width="100%" height="100%" fill="${palette.background}" />
    <rect x="0" y="0" width="${width}" height="128" fill="${palette.surface}" />
    ${categoryIcon(brief.category, pad, 40, palette.primary)}
    ${tspans(fitLines(brief.headline, width - pad * 2 - 80, typo.h1, 2, false, false), pad + 72, 78, lineHeight(typo.h1), {
      "font-family": typo.fontFamilyDisplay,
      "font-size": typo.h1,
      "font-weight": "700",
      fill: palette.text,
    })}
    <text x="${width - pad}" y="78" text-anchor="end" font-family="${typo.fontFamily}" font-size="${typo.caption}" fill="${palette.textMuted}">${escapeXml(brief.designType)}</text>
    <rect x="${pad}" y="156" width="${colW}" height="${height - 186}" rx="${style.cornerRadius}" fill="${palette.surface}" stroke="${palette.border}" stroke-width="${style.strokeWidth}" />
    ${tspans(bodyLines, pad + 24, 196, lineHeight(typo.body), {
      "font-family": typo.fontFamily,
      "font-size": typo.body,
      fill: palette.text,
    })}
    <g transform="translate(${pad * 2 + colW}, 156)">
      ${points
        .map((p, i) => {
          const fit = fitEditorialKeyPointInTile(p, colW, typo.body);
          if (!fit) {
            throw new Error(`Editorial key point ${i + 1} does not fit in tile`);
          }
          const lh = lineHeight(fit.fontSize);
          return `
        <rect y="${i * TILE_ROW_STEP}" width="${colW}" height="96" rx="${style.cornerRadius}" fill="${palette.background}" stroke="${palette.primary}" stroke-width="2" />
        <text x="20" y="${i * TILE_ROW_STEP + EDITORIAL_TILE_TEXT_OFFSET_Y}" font-family="${typo.fontFamily}" font-size="${typo.h3}" font-weight="700" fill="${palette.primary}">${i + 1}</text>
        ${tspans(fit.lines, EDITORIAL_TILE_TEXT_INSET_X, i * TILE_ROW_STEP + EDITORIAL_TILE_TEXT_OFFSET_Y, lh, {
          "font-family": typo.fontFamily,
          "font-size": fit.fontSize,
          fill: palette.text,
        })}
      `;
        })
        .join("")}
    </g>
  `;
};
