import type { GenerationBrief } from "@vector-forge/shared";
import {
  TYPOGRAPHY,
  getPalette,
  getStyle,
  type StylePreset,
} from "@vector-forge/shared";
import { escapeXml } from "./escape.js";
import { LAYOUT_RENDERERS } from "./layouts/index.js";

export interface RenderOptions {
  styleId?: string;
  paletteId?: string;
}

export function renderSvg(brief: GenerationBrief, options: RenderOptions = {}): string {
  const style: StylePreset = getStyle(options.styleId ?? "tech-pulse");
  const palette = getPalette(options.paletteId ?? brief.paletteId ?? style.paletteId);
  const renderer = LAYOUT_RENDERERS[brief.layoutFamily];
  const { width, height } = brief.canvas;
  const inner = renderer({
    brief,
    palette,
    style,
    typo: TYPOGRAPHY,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(brief.headline)}">
  <title>${escapeXml(brief.headline)}</title>
  <desc>${escapeXml(brief.topic)}</desc>
  ${inner}
</svg>`;
}
