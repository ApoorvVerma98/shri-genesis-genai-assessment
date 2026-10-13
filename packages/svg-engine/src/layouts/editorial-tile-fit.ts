import { SPACING, TYPOGRAPHY, type GenerationBrief } from "@vector-forge/shared";
import { charsPerLine, lineHeight } from "../typography.js";
import { wrapText } from "../text.js";

/** Matches `editorial.ts` key-point card geometry. */
export const EDITORIAL_TILE_HEIGHT = 96;
export const EDITORIAL_TILE_TEXT_OFFSET_Y = 38;
export const EDITORIAL_TILE_PADDING_BOTTOM = 10;
export const EDITORIAL_TILE_TEXT_INSET_X = 48;
export const EDITORIAL_TILE_TEXT_WIDTH_INSET = 56;
export const EDITORIAL_KEY_POINT_MIN_FONT = 12;

export function editorialColumnWidth(canvasWidth: number): number {
  const pad = SPACING.lg;
  return (canvasWidth - pad * 3) / 2;
}

export function editorialTileTextMaxLines(bodyFontSize: number): number {
  const available =
    EDITORIAL_TILE_HEIGHT - EDITORIAL_TILE_TEXT_OFFSET_Y - EDITORIAL_TILE_PADDING_BOTTOM;
  const lh = lineHeight(bodyFontSize);
  return Math.max(1, Math.floor(available / lh));
}

export interface EditorialTileFit {
  lines: string[];
  fontSize: number;
}

/** Fit full key-point copy in a tile without ellipsis; null if not legible at min font. */
export function fitEditorialKeyPointInTile(
  text: string,
  columnWidth: number,
  bodyFontSize = TYPOGRAPHY.body,
): EditorialTileFit | null {
  const trimmed = text.trim();
  if (!trimmed) return { lines: [""], fontSize: bodyFontSize };

  const maxWidthPx = columnWidth - EDITORIAL_TILE_TEXT_WIDTH_INSET;
  const maxLinesAtBody = editorialTileTextMaxLines(bodyFontSize);

  for (let fs = bodyFontSize; fs >= EDITORIAL_KEY_POINT_MIN_FONT; fs--) {
    const maxLines = editorialTileTextMaxLines(fs);
    const cpl = charsPerLine(maxWidthPx, fs, false);
    const wrapped = wrapText(trimmed, cpl);
    if (wrapped.length <= maxLines) {
      return { lines: wrapped, fontSize: fs };
    }
  }
  return null;
}

export function validateEditorialLayoutFit(brief: GenerationBrief): string[] {
  if (brief.layoutFamily !== "editorial-infographic") return [];

  const issues: string[] = [];
  const colW = editorialColumnWidth(brief.canvas.width);
  const points = brief.keyPoints?.slice(0, 4) ?? [];

  for (let i = 0; i < points.length; i++) {
    const fit = fitEditorialKeyPointInTile(points[i], colW, TYPOGRAPHY.body);
    if (!fit) {
      issues.push(
        `Editorial layout: key point ${i + 1} does not fit in tile at minimum ${EDITORIAL_KEY_POINT_MIN_FONT}px`,
      );
    }
  }
  return issues;
}
