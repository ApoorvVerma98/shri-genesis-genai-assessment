const LAYOUT_LABELS: Record<string, string> = {
  "promotional-banner": "Promotional banner",
  "editorial-infographic": "Editorial infographic",
  "metrics-dashboard": "Metrics dashboard",
  "step-by-step": "Step-by-step guide",
  comparison: "Comparison",
  "feature-grid": "Feature grid",
  "quote-banner": "Quote banner",
  "list-announcement": "List announcement",
};

export function layoutLabel(layoutFamily: string): string {
  return LAYOUT_LABELS[layoutFamily] ?? layoutFamily;
}

export function categoryLabel(category: string): string {
  return category
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
