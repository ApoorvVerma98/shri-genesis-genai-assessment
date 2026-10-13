import type { GenerationBrief } from "@vector-forge/shared";

export interface ComparisonColumnData {
  title: string;
  points: string[];
}

export interface ResolvedComparisonColumns {
  left: ComparisonColumnData;
  right: ComparisonColumnData;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function distinctiveWords(title: string): string[] {
  const stop = new Set(["the", "and", "for", "with", "model", "playbook", "playbooks", "approach"]);
  return norm(title)
    .split(" ")
    .filter((w) => w.length > 2 && !stop.has(w));
}

function titleAffinity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 10;
  if (na.includes(nb) || nb.includes(na)) return 8;
  const aWords = new Set(na.split(" ").filter(Boolean));
  let shared = 0;
  for (const w of nb.split(" ").filter(Boolean)) if (aWords.has(w)) shared++;
  return shared;
}

/** Known opposing label/title stems (used with title tokens, not alone). */
const OPPOSING_STEMS: [string, string][] = [
  ["central", "decentral"],
  ["local", "global"],
  ["advantage", "disadvantage"],
  ["pro", "con"],
  ["traditional", "modern"],
  ["manual", "automated"],
];

function stemsOpposed(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  for (const [x, y] of OPPOSING_STEMS) {
    const hasXa = na.includes(x);
    const hasYa = na.includes(y);
    const hasXb = nb.includes(x);
    const hasYb = nb.includes(y);
    if ((hasXa && hasYb) || (hasYa && hasXb)) return true;
  }
  return false;
}

function extractLeadingLabel(point: string): string | null {
  const m = point.match(/^([^:]{2,60}):\s*.+/);
  return m ? m[1].trim() : null;
}

function stripLabelPrefix(point: string): string {
  const m = point.match(/^[^:]+:\s*(.+)$/);
  return (m ? m[1] : point).trim();
}

/**
 * Classify a bullet to left/right using explicit "Label: body" prefixes and column titles.
 */
export function classifyComparisonPoint(
  point: string,
  leftTitle: string,
  rightTitle: string,
): "left" | "right" | "unknown" {
  const label = extractLeadingLabel(point);
  if (label) {
    const leftScore = titleAffinity(label, leftTitle);
    const rightScore = titleAffinity(label, rightTitle);
    if (leftScore >= 4 && leftScore > rightScore) return "left";
    if (rightScore >= 4 && rightScore > leftScore) return "right";
    if (stemsOpposed(label, leftTitle) && !stemsOpposed(label, rightTitle)) return "right";
    if (stemsOpposed(label, rightTitle) && !stemsOpposed(label, leftTitle)) return "left";
    if (stemsOpposed(leftTitle, rightTitle)) {
      if (stemsOpposed(label, leftTitle)) return "right";
      if (stemsOpposed(label, rightTitle)) return "left";
    }
  }
  const body = stripLabelPrefix(point);
  if (stemsOpposed(leftTitle, rightTitle)) {
    if (stemsOpposed(body, leftTitle) && !stemsOpposed(body, rightTitle)) return "right";
    if (stemsOpposed(body, rightTitle) && !stemsOpposed(body, leftTitle)) return "left";
  }
  return "unknown";
}

/** True if a point assigned to expectedSide actually belongs on the opposite column. */
export function pointMisassignedForColumn(
  point: string,
  expectedSide: "left" | "right",
  leftTitle: string,
  rightTitle: string,
): boolean {
  const classified = classifyComparisonPoint(point, leftTitle, rightTitle);
  if (expectedSide === "left" && classified === "right") return true;
  if (expectedSide === "right" && classified === "left") return true;
  if (classified !== "unknown") return false;

  const columnTitle = expectedSide === "left" ? leftTitle : rightTitle;
  const otherTitle = expectedSide === "left" ? rightTitle : leftTitle;
  const label = extractLeadingLabel(point);
  if (label && stemsOpposed(label, columnTitle) && titleAffinity(label, otherTitle) >= 2) {
    return true;
  }
  return pointContradictsTitleScope(point, columnTitle);
}

function alignItemsToTitles(c: NonNullable<GenerationBrief["comparison"]>) {
  const [i0, i1] = c.items;
  const scoreDirect = titleAffinity(i0.name, c.leftTitle) + titleAffinity(i1.name, c.rightTitle);
  const scoreSwap = titleAffinity(i1.name, c.leftTitle) + titleAffinity(i0.name, c.rightTitle);
  return scoreSwap > scoreDirect ? [i1, i0] : [i0, i1];
}

function redistributeComparisonPoints(c: NonNullable<GenerationBrief["comparison"]>) {
  const [itemLeft, itemRight] = alignItemsToTitles(c);
  const tagged: { point: string; source: "left" | "right" }[] = [
    ...itemLeft.points.map((p) => ({ point: p, source: "left" as const })),
    ...itemRight.points.map((p) => ({ point: p, source: "right" as const })),
  ];

  const leftPoints: string[] = [];
  const rightPoints: string[] = [];

  for (const { point, source } of tagged) {
    const side = classifyComparisonPoint(point, c.leftTitle, c.rightTitle);
    const cleaned = stripLabelPrefix(point);
    if (side === "left") leftPoints.push(cleaned);
    else if (side === "right") rightPoints.push(cleaned);
    else if (source === "left") leftPoints.push(cleaned);
    else rightPoints.push(cleaned);
  }

  return {
    leftTitle: c.leftTitle,
    rightTitle: c.rightTitle,
    leftPoints,
    rightPoints,
  };
}

/**
 * Normalize item order, then split mixed bullets into left/right columns by label + title.
 */
export function normalizeComparisonBrief(brief: GenerationBrief): GenerationBrief {
  if (brief.layoutFamily !== "comparison" || !brief.comparison) return brief;
  const c = brief.comparison;
  if (c.items.length < 2) return brief;

  const redistributed = redistributeComparisonPoints(c);

  return {
    ...brief,
    comparison: {
      leftTitle: c.leftTitle,
      rightTitle: c.rightTitle,
      items: [
        {
          name: c.leftTitle,
          points: redistributed.leftPoints.length ? redistributed.leftPoints : ["—"],
        },
        {
          name: c.rightTitle,
          points: redistributed.rightPoints.length ? redistributed.rightPoints : ["—"],
        },
      ],
    },
  };
}

export function getResolvedComparisonColumns(brief: GenerationBrief): ResolvedComparisonColumns | null {
  if (brief.layoutFamily !== "comparison" || !brief.comparison) return null;
  const normalized = normalizeComparisonBrief(brief);
  const c = normalized.comparison!;
  return {
    left: { title: c.leftTitle, points: c.items[0]?.points ?? [] },
    right: { title: c.rightTitle, points: c.items[1]?.points ?? [] },
  };
}

export function validateComparisonSemantics(brief: GenerationBrief): string[] {
  if (brief.layoutFamily !== "comparison" || !brief.comparison) return [];
  const normalized = normalizeComparisonBrief(brief);
  const c = normalized.comparison!;
  const issues: string[] = [];

  if (c.items.length < 2) {
    issues.push("Comparison requires two sides with points");
    return issues;
  }

  const left = c.items[0];
  const right = c.items[1];

  const realPoint = (p: string) => p.trim() !== "" && p !== "—";
  const leftReal = (left.points ?? []).filter(realPoint);
  const rightReal = (right.points ?? []).filter(realPoint);
  if (!leftReal.length || !rightReal.length) {
    issues.push("Comparison sides need at least one point each");
  }

  for (const p of left.points ?? []) {
    if (pointMisassignedForColumn(p, "left", c.leftTitle, c.rightTitle)) {
      issues.push(`Comparison assignment: left column contains other-side point (${p.slice(0, 40)})`);
      break;
    }
  }
  for (const p of right.points ?? []) {
    if (pointMisassignedForColumn(p, "right", c.leftTitle, c.rightTitle)) {
      issues.push(`Comparison assignment: right column contains other-side point (${p.slice(0, 40)})`);
      break;
    }
  }

  const leftSet = new Set((left.points ?? []).map((p) => norm(p)));
  for (const p of right.points ?? []) {
    if (leftSet.has(norm(p))) {
      issues.push("Comparison semantics: duplicate point on both sides");
      break;
    }
  }

  return issues;
}

/** Unlabeled bullet scope clashes with column title (local/global and opposing stems). */
export function pointContradictsTitleScope(point: string, columnTitle: string): boolean {
  const body = stripLabelPrefix(point);
  const local = /\b(local|regional)\b/i.test(columnTitle);
  const global = /\b(global|worldwide|international)\b/i.test(columnTitle);
  const pLocal = /\b(local|regional)\b/i.test(body);
  const pGlobal = /\b(global|worldwide|international)\b/i.test(body);
  if (global && pLocal && !pGlobal) return true;
  if (local && pGlobal && !pLocal) return true;
  if (stemsOpposed(body, columnTitle)) return true;
  return false;
}
