import type { LayoutFamily } from "@vector-forge/shared";
import { renderComparison } from "./comparison.js";
import { renderEditorial } from "./editorial.js";
import { renderFeatureGrid } from "./feature-grid.js";
import { renderListAnnouncement } from "./list-announcement.js";
import { renderMetrics } from "./metrics.js";
import { renderPromotionalBanner } from "./promotional-banner.js";
import { renderQuote } from "./quote.js";
import { renderSteps } from "./steps.js";
import type { LayoutRenderer } from "./types.js";

export const LAYOUT_RENDERERS: Record<LayoutFamily, LayoutRenderer> = {
  "promotional-banner": renderPromotionalBanner,
  "editorial-infographic": renderEditorial,
  "metrics-dashboard": renderMetrics,
  "step-by-step": renderSteps,
  comparison: renderComparison,
  "feature-grid": renderFeatureGrid,
  "quote-banner": renderQuote,
  "list-announcement": renderListAnnouncement,
};
