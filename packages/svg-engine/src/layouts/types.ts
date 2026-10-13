import type { GenerationBrief } from "@vector-forge/shared";
import type { ColorPalette, StylePreset, TypographyScale } from "@vector-forge/shared";

export interface LayoutContext {
  brief: GenerationBrief;
  palette: ColorPalette;
  style: StylePreset;
  typo: TypographyScale;
}

export type LayoutRenderer = (ctx: LayoutContext) => string;
