import { escapeXml } from "./escape.js";

/** Conservative character-based wrap (no font metrics in Node). */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function textBlock(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  attrs: Record<string, string | number>,
): string {
  const base = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(" ");
  return lines
    .map(
      (line, i) =>
        `<text ${base} x="${x}" y="${y + i * lineHeight}">${escapeXml(line)}</text>`,
    )
    .join("\n");
}

export function tspans(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  attrs: Record<string, string | number>,
): string {
  const base = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(" ");
  const inner = lines
    .map(
      (line, i) =>
        `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  return `<text ${base} x="${x}" y="${startY}">${inner}</text>`;
}
