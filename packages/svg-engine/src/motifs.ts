import type { ColorPalette, StylePreset } from "@vector-forge/shared";

export function backgroundMotif(
  width: number,
  height: number,
  palette: ColorPalette,
  style: StylePreset,
): string {
  const id = `motif-${style.motif}`;
  switch (style.motif) {
    case "circles":
      return `
        <g opacity="0.35" id="${id}">
          <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${height * 0.25}" fill="${palette.secondary}" />
          <circle cx="${width * 0.1}" cy="${height * 0.75}" r="${height * 0.18}" fill="${palette.accent}" />
        </g>`;
    case "diagonal":
      return `
        <g opacity="0.2" id="${id}">
          <path d="M0 ${height} L${width} 0 L${width} ${height * 0.35} L0 ${height}" fill="${palette.primary}" />
        </g>`;
    case "grid":
      return `
        <g opacity="0.12" stroke="${palette.border}" id="${id}">
          ${Array.from({ length: 8 }, (_, i) => {
            const x = (width / 8) * (i + 1);
            return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke-width="1" />`;
          }).join("")}
          ${Array.from({ length: 5 }, (_, i) => {
            const y = (height / 5) * (i + 1);
            return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke-width="1" />`;
          }).join("")}
        </g>`;
    case "waves":
      return `
        <path id="${id}" opacity="0.25" fill="${palette.secondary}" d="M0 ${height * 0.7} Q ${width * 0.25} ${height * 0.55} ${width * 0.5} ${height * 0.7} T ${width} ${height * 0.65} L ${width} ${height} L 0 ${height} Z" />`;
    case "hex":
      return `
        <g opacity="0.2" id="${id}" fill="none" stroke="${palette.primary}" stroke-width="2">
          <polygon points="${width * 0.75},${height * 0.2} ${width * 0.9},${height * 0.35} ${width * 0.9},${height * 0.55} ${width * 0.75},${height * 0.7} ${width * 0.6},${height * 0.55} ${width * 0.6},${height * 0.35}" />
        </g>`;
    case "nodes":
    default:
      return `
        <g opacity="0.4" id="${id}">
          <circle cx="${width * 0.78}" cy="${height * 0.28}" r="6" fill="${palette.accent}" />
          <circle cx="${width * 0.88}" cy="${height * 0.38}" r="4" fill="${palette.primary}" />
          <line x1="${width * 0.78}" y1="${height * 0.28}" x2="${width * 0.88}" y2="${height * 0.38}" stroke="${palette.primary}" stroke-width="2" />
          <circle cx="${width * 0.82}" cy="${height * 0.5}" r="5" fill="${palette.secondary}" />
          <line x1="${width * 0.88}" y1="${height * 0.38}" x2="${width * 0.82}" y2="${height * 0.5}" stroke="${palette.secondary}" stroke-width="2" />
        </g>`;
  }
}

export function categoryIcon(category: string, x: number, y: number, color: string): string {
  const size = 48;
  switch (category) {
    case "healthcare":
      return `<g transform="translate(${x},${y})"><rect width="${size}" height="${size}" rx="8" fill="${color}" opacity="0.2"/><path d="M${size / 2} 12 v${size - 24} M${size / 2 - 10} ${size / 2} h20" stroke="${color}" stroke-width="4" fill="none"/></g>`;
    case "finance":
      return `<g transform="translate(${x},${y})"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="none" stroke="${color}" stroke-width="3"/><text x="${size / 2}" y="${size / 2 + 6}" text-anchor="middle" font-size="22" fill="${color}" font-family="sans-serif">$</text></g>`;
    case "cybersecurity":
      return `<g transform="translate(${x},${y})"><path d="M${size / 2} 8 L${size - 8} 16 v${size / 2 - 8} a${size / 4} ${size / 4} 0 0 1 -${size / 2} 0 v-${size / 2 - 8} Z" fill="none" stroke="${color}" stroke-width="3"/></g>`;
    default:
      return `<g transform="translate(${x},${y})"><rect x="6" y="6" width="${size - 12}" height="${size - 12}" rx="10" fill="none" stroke="${color}" stroke-width="3"/><circle cx="${size / 2}" cy="${size / 2}" r="8" fill="${color}"/></g>`;
  }
}
