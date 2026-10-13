/** Detect visible ellipsis truncation baked into SVG text (not structural XML failure). */
export function detectSvgTextTruncation(svg: string): string[] {
  const issues: string[] = [];
  if (svg.includes("…") || /\.\.\.(?=<\/text>)/.test(svg)) {
    issues.push("Visual/text-fit: SVG contains truncated text (ellipsis)");
  }
  return issues;
}
