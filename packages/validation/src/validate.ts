import type { GenerationBrief } from "@vector-forge/shared";
import { getPalette } from "@vector-forge/shared";
import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import { meetsWcagAA, contrastRatio } from "./contrast.js";
import { detectGenericCopy } from "./content-quality.js";

export interface ValidationResult {
  passed: boolean;
  issues: string[];
  contentHash?: string;
  structureHash?: string;
}

const UNSAFE_PATTERNS = [
  /<script/i,
  /on\w+\s*=/i,
  /javascript:/i,
  /<iframe/i,
  /xlink:href\s*=\s*["']http/i,
  /<foreignObject/i,
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export function hashContent(svg: string): string {
  return createHash("sha256").update(svg).digest("hex");
}

export function structureHash(svg: string): string {
  const normalized = svg
    .replace(/\d+\.?\d*/g, "N")
    .replace(/>\s+</g, "><")
    .trim();
  return createHash("sha256").update(normalized).digest("hex");
}

export function validateSvgStructure(svg: string): ValidationResult {
  const issues: string[] = [];

  if (!svg.trim().startsWith("<?xml") && !svg.trim().startsWith("<svg")) {
    issues.push("Missing XML declaration or SVG root");
  }

  for (const pat of UNSAFE_PATTERNS) {
    if (pat.test(svg)) issues.push(`Unsafe content detected: ${pat.source}`);
  }

  if (/href\s*=\s*["']https?:/i.test(svg)) {
    issues.push("External href references are not allowed");
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(svg);
  } catch (e) {
    issues.push(`XML parse error: ${e instanceof Error ? e.message : String(e)}`);
    return { passed: false, issues };
  }

  const root = (parsed as Record<string, unknown>)?.svg ?? (parsed as Record<string, unknown>)?.["?xml"];
  const svgNode = (parsed as Record<string, unknown>).svg as Record<string, unknown> | undefined;
  if (!svgNode) {
    issues.push("Missing SVG root element");
    return { passed: false, issues, contentHash: hashContent(svg) };
  }

  const w = svgNode["@_width"];
  const h = svgNode["@_height"];
  const vb = svgNode["@_viewBox"];
  if (!w || !h) issues.push("Missing width or height on SVG root");
  if (!vb) issues.push("Missing viewBox on SVG root");

  const hasVector =
    svg.includes("<rect") ||
    svg.includes("<path") ||
    svg.includes("<circle") ||
    svg.includes("<text") ||
    svg.includes("<polygon");
  if (!hasVector) issues.push("No vector elements found");

  if (svg.length < 200) issues.push("SVG output suspiciously short");

  const contentHash = hashContent(svg);
  const sHash = structureHash(svg);

  return {
    passed: issues.length === 0,
    issues,
    contentHash,
    structureHash: sHash,
  };
}

export function validateBriefContent(brief: GenerationBrief): string[] {
  const issues: string[] = [];
  if (!brief.headline?.trim()) issues.push("Missing headline");
  if (brief.headline.length > 120) issues.push("Headline too long");
  issues.push(...detectGenericCopy(brief));

  switch (brief.layoutFamily) {
    case "metrics-dashboard":
      if (!brief.metrics?.length) issues.push("Metrics layout requires metrics");
      break;
    case "step-by-step":
      if (!brief.steps?.length) issues.push("Step layout requires steps");
      break;
    case "comparison":
      if (!brief.comparison && (!brief.keyPoints || brief.keyPoints.length < 2)) {
        issues.push("Comparison layout requires comparison or key points");
      }
      break;
    case "quote-banner":
      if (!brief.quote?.text && !brief.headline) issues.push("Quote layout requires quote text");
      break;
    case "feature-grid":
    case "list-announcement":
      if (!brief.keyPoints?.length && !brief.supportingText) {
        issues.push("List/grid layout requires key points or supporting text");
      }
      break;
    default:
      break;
  }
  return issues;
}

/** Heuristic contrast check using design tokens (not per-pixel render). */
export function validatePaletteContrast(paletteId: string): string[] {
  const issues: string[] = [];
  const p = getPalette(paletteId);
  const body = contrastRatio(p.text, p.background);
  const muted = contrastRatio(p.textMuted, p.background);
  if (!meetsWcagAA(body)) {
    issues.push(`Low text/background contrast (heuristic): ${body?.toFixed(2) ?? "n/a"}`);
  }
  if (muted !== null && muted < 3) {
    issues.push(`Muted text contrast may be weak (heuristic): ${muted.toFixed(2)}`);
  }
  return issues;
}

export function findExactDuplicates(hashes: string[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  hashes.forEach((h, i) => {
    const arr = map.get(h) ?? [];
    arr.push(i);
    map.set(h, arr);
  });
  const dups = new Map<string, number[]>();
  for (const [h, indices] of map) {
    if (indices.length > 1) dups.set(h, indices);
  }
  return dups;
}

/** Heuristic: same structure hash and similar text length */
export function flagNearDuplicates(
  entries: { structureHash?: string; headline: string }[],
): number[][] {
  const groups: number[][] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (
        a.structureHash &&
        b.structureHash &&
        a.structureHash === b.structureHash &&
        a.headline === b.headline
      ) {
        groups.push([i, j]);
      }
    }
  }
  return groups;
}
