import type { BatchManifest, ManifestEntry } from "./schemas.js";

export interface CategoryCoverageRow {
  category: string;
  planned: number;
  actual: number;
  ai: number;
  fallback: number;
  unknown: number;
  validationFailed: number;
  sampleIds: string[];
}

export interface LayoutCoverageRow {
  layoutFamily: string;
  actual: number;
  ai: number;
  fallback: number;
  unknown: number;
  sampleIds: string[];
}

export interface ManifestCoverageReport {
  collection: string;
  totalEntries: number;
  ai: number;
  fallback: number;
  unknown: number;
  hybrid: number;
  validationPassed: number;
  validationFailed: number;
  categories: CategoryCoverageRow[];
  layouts: LayoutCoverageRow[];
  generatedAt: string;
}

function countMode(entries: ManifestEntry[], mode: string): number {
  return entries.filter((e) => e.contentMode === mode).length;
}

export function buildManifestCoverageReport(
  manifest: BatchManifest,
  collectionLabel = "assessment",
): ManifestCoverageReport {
  const entries = manifest.entries ?? [];
  const byCategory = new Map<string, ManifestEntry[]>();
  const byLayout = new Map<string, ManifestEntry[]>();

  for (const e of entries) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category)!.push(e);
    if (!byLayout.has(e.layoutFamily)) byLayout.set(e.layoutFamily, []);
    byLayout.get(e.layoutFamily)!.push(e);
  }

  const categories: CategoryCoverageRow[] = [...byCategory.entries()]
    .map(([category, list]) => ({
      category,
      planned: list.length,
      actual: list.length,
      ai: countMode(list, "ai"),
      fallback: countMode(list, "fallback"),
      unknown: countMode(list, "unknown"),
      validationFailed: list.filter((e) => e.validationStatus !== "passed").length,
      sampleIds: list.slice(0, 3).map((e) => e.id),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const layouts: LayoutCoverageRow[] = [...byLayout.entries()]
    .map(([layoutFamily, list]) => ({
      layoutFamily,
      actual: list.length,
      ai: countMode(list, "ai"),
      fallback: countMode(list, "fallback"),
      unknown: countMode(list, "unknown"),
      sampleIds: list.slice(0, 2).map((e) => e.id),
    }))
    .sort((a, b) => a.layoutFamily.localeCompare(b.layoutFamily));

  return {
    collection: collectionLabel,
    totalEntries: entries.length,
    ai: countMode(entries, "ai"),
    fallback: countMode(entries, "fallback"),
    unknown: countMode(entries, "unknown"),
    hybrid: countMode(entries, "hybrid"),
    validationPassed: entries.filter((e) => e.validationStatus === "passed").length,
    validationFailed: entries.filter((e) => e.validationStatus !== "passed").length,
    categories,
    layouts,
    generatedAt: new Date().toISOString(),
  };
}
