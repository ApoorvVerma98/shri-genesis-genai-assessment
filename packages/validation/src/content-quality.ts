import type { GenerationBrief } from "@vector-forge/shared";

const GENERIC_PHRASES = [
  "a focused guide",
  "practical actions for this week",
  "signals that show you are on track",
  "common pitfalls to avoid",
];

export function detectGenericCopy(brief: GenerationBrief): string[] {
  const issues: string[] = [];
  const blob = [
    brief.headline,
    brief.subtitle,
    brief.supportingText,
    ...(brief.keyPoints ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const phrase of GENERIC_PHRASES) {
    if (blob.includes(phrase)) issues.push(`Generic phrase detected: "${phrase}"`);
  }
  return issues;
}

export function detectHeadlineRepetition(headlines: string[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  headlines.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    const arr = map.get(key) ?? [];
    arr.push(i);
    map.set(key, arr);
  });
  const dups = new Map<string, number[]>();
  for (const [h, idx] of map) {
    if (idx.length > 1) dups.set(h, idx);
  }
  return dups;
}

export function detectNearDuplicateBriefs(
  entries: { headline?: string; layoutFamily: string; structureHash?: string }[],
): number[][] {
  const pairs: number[][] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (
        a.structureHash &&
        b.structureHash &&
        a.structureHash === b.structureHash &&
        a.headline &&
        b.headline &&
        a.headline === b.headline
      ) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}
