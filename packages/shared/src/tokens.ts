export interface ColorPalette {
  id: string;
  name: string;
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface TypographyScale {
  display: number;
  h1: number;
  h2: number;
  h3: number;
  body: number;
  caption: number;
  fontFamily: string;
  fontFamilyDisplay: string;
}

export interface StylePreset {
  id: string;
  name: string;
  paletteId: string;
  cornerRadius: number;
  strokeWidth: number;
  motif: "circles" | "diagonal" | "grid" | "waves" | "hex" | "nodes";
}

export const PALETTES: ColorPalette[] = [
  {
    id: "midnight-cyan",
    name: "Midnight Cyan",
    background: "#0B1220",
    surface: "#141C2F",
    primary: "#22D3EE",
    secondary: "#6366F1",
    accent: "#F472B6",
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    border: "#334155",
  },
  {
    id: "forest-sage",
    name: "Forest Sage",
    background: "#0F1A14",
    surface: "#1A2B22",
    primary: "#4ADE80",
    secondary: "#2DD4BF",
    accent: "#FBBF24",
    text: "#ECFDF5",
    textMuted: "#86EFAC",
    border: "#3F5E4F",
  },
  {
    id: "sunrise-warm",
    name: "Sunrise Warm",
    background: "#1C1410",
    surface: "#2A1F18",
    primary: "#FB923C",
    secondary: "#F97316",
    accent: "#FDE047",
    text: "#FFF7ED",
    textMuted: "#FDBA74",
    border: "#5C4033",
  },
  {
    id: "corporate-slate",
    name: "Corporate Slate",
    background: "#F1F5F9",
    surface: "#FFFFFF",
    primary: "#0F172A",
    secondary: "#2563EB",
    accent: "#7C3AED",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#CBD5E1",
  },
  {
    id: "berry-night",
    name: "Berry Night",
    background: "#1A0B1F",
    surface: "#2A1233",
    primary: "#E879F9",
    secondary: "#A855F7",
    accent: "#38BDF8",
    text: "#FAF5FF",
    textMuted: "#D8B4FE",
    border: "#581C87",
  },
  {
    id: "ocean-light",
    name: "Ocean Light",
    background: "#E0F2FE",
    surface: "#F0F9FF",
    primary: "#0369A1",
    secondary: "#0284C7",
    accent: "#F43F5E",
    text: "#0C4A6E",
    textMuted: "#64748B",
    border: "#7DD3FC",
  },
];

export const TYPOGRAPHY: TypographyScale = {
  display: 52,
  h1: 40,
  h2: 30,
  h3: 22,
  body: 18,
  caption: 14,
  fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif",
  fontFamilyDisplay: "Georgia, Cambria, Times New Roman, serif",
};

export const STYLE_PRESETS: StylePreset[] = [
  { id: "tech-pulse", name: "Tech Pulse", paletteId: "midnight-cyan", cornerRadius: 12, strokeWidth: 2, motif: "nodes" },
  { id: "eco-growth", name: "Eco Growth", paletteId: "forest-sage", cornerRadius: 16, strokeWidth: 2, motif: "waves" },
  { id: "launch-energy", name: "Launch Energy", paletteId: "sunrise-warm", cornerRadius: 8, strokeWidth: 2.5, motif: "diagonal" },
  { id: "boardroom", name: "Boardroom", paletteId: "corporate-slate", cornerRadius: 6, strokeWidth: 1.5, motif: "grid" },
  { id: "creative-bloom", name: "Creative Bloom", paletteId: "berry-night", cornerRadius: 20, strokeWidth: 2, motif: "circles" },
  { id: "clinic-calm", name: "Clinic Calm", paletteId: "ocean-light", cornerRadius: 14, strokeWidth: 2, motif: "hex" },
];

export function getPalette(id: string): ColorPalette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export function getStyle(id: string): StylePreset {
  return STYLE_PRESETS.find((s) => s.id === id) ?? STYLE_PRESETS[0];
}

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
  xxl: 64,
};
