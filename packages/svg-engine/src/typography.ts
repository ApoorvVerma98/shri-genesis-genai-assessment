import { wrapText } from "./text.js";

/** Estimated average glyph width as a fraction of font size (conservative). */
export function charsPerLine(maxWidthPx: number, fontSize: number, tight = false): number {
  const factor = tight ? 0.48 : 0.56;
  return Math.max(6, Math.floor(maxWidthPx / (fontSize * factor)));
}

export function lineHeight(fontSize: number, ratio = 1.28): number {
  return Math.round(fontSize * ratio * 10) / 10;
}

export function truncateText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  if (maxChars <= 1) return "…";
  return `${t.slice(0, maxChars - 1).trimEnd()}…`;
}

export function fitLines(
  text: string,
  maxWidthPx: number,
  fontSize: number,
  maxLines: number,
  tight = false,
  allowTruncate = true,
): string[] {
  const cpl = charsPerLine(maxWidthPx, fontSize, tight);
  const maxChars = cpl * maxLines;
  const source = allowTruncate ? truncateText(text, maxChars) : text.trim();
  return wrapText(source, cpl).slice(0, maxLines);
}

/** Wrap full text by scaling font down; avoids ellipsis when possible. */
export function fitLinesAutoScale(
  text: string,
  maxWidthPx: number,
  startFontSize: number,
  minFontSize: number,
  maxLines: number,
  tight = false,
): { lines: string[]; fontSize: number } {
  const trimmed = text.trim();
  if (!trimmed) return { lines: [""], fontSize: startFontSize };

  for (let fs = startFontSize; fs >= minFontSize; fs--) {
    const cpl = charsPerLine(maxWidthPx, fs, tight);
    const wrapped = wrapText(trimmed, cpl);
    if (wrapped.length <= maxLines) {
      return { lines: wrapped, fontSize: fs };
    }
  }
  const cpl = charsPerLine(maxWidthPx, minFontSize, tight);
  const wrapped = wrapText(trimmed, cpl);
  return {
    lines: wrapped.slice(0, Math.max(maxLines, wrapped.length)),
    fontSize: minFontSize,
  };
}

export interface ContentBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function maxLinesInBox(fontSize: number, boxHeight: number, ratio = 1.28): number {
  const lh = lineHeight(fontSize, ratio);
  return Math.max(1, Math.floor(boxHeight / lh));
}
