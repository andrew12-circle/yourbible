export interface Cover {
  id: string; label: string; tagline: string;
  /** CSS background (used inline so we can render swatches) */
  swatch: string;
}

export const COVERS: Cover[] = [
  { id: "cordovan", label: "Cordovan", tagline: "Deep oxblood, classic", swatch: "linear-gradient(135deg, hsl(0 55% 14%), hsl(0 48% 22%))" },
  { id: "obsidian", label: "Obsidian", tagline: "Black with gold edges", swatch: "linear-gradient(135deg, hsl(0 0% 8%), hsl(0 0% 14%))" },
  { id: "blush", label: "Blush", tagline: "Warm rose, soft", swatch: "linear-gradient(135deg, hsl(8 38% 38%), hsl(8 50% 52%))" },
  { id: "sand", label: "Sand Linen", tagline: "Natural, light, woven", swatch: "linear-gradient(135deg, hsl(36 30% 64%), hsl(38 36% 76%))" },
];

export interface Palette {
  id: string; label: string; tagline: string;
  /** Highlight color tokens (CSS vars) */
  colors: { name: string; cssVar: string; meaning?: string }[];
}

export const PALETTES: Palette[] = [
  {
    id: "classic",
    label: "Classic Warm",
    tagline: "Amber, peach, sage — the journaling staples",
    colors: [
      { name: "Amber", cssVar: "--hl-amber", meaning: "Promise" },
      { name: "Peach", cssVar: "--hl-peach", meaning: "Identity" },
      { name: "Sage", cssVar: "--hl-sage", meaning: "Wisdom" },
    ],
  },
  {
    id: "pastel",
    label: "Pastel",
    tagline: "Soft and muted",
    colors: [
      { name: "Rose", cssVar: "--hl-rose", meaning: "Love" },
      { name: "Sky", cssVar: "--hl-sky", meaning: "Hope" },
      { name: "Violet", cssVar: "--hl-violet", meaning: "Mystery" },
    ],
  },
  {
    id: "jewel",
    label: "Jewel",
    tagline: "Saturated and bold",
    colors: [
      { name: "Amber", cssVar: "--hl-amber", meaning: "Promise" },
      { name: "Violet", cssVar: "--hl-violet", meaning: "Royalty" },
      { name: "Sage", cssVar: "--hl-sage", meaning: "Renewal" },
      { name: "Rose", cssVar: "--hl-rose", meaning: "Mercy" },
    ],
  },
];

export function getCover(id: string) {
  return COVERS.find(c => c.id === id) ?? COVERS[0];
}
export function getPalette(id: string) {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0];
}

export const RIBBON_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "red", label: "Red", hex: "#9b1d20" },
  { id: "gold", label: "Gold", hex: "#c89a3a" },
  { id: "blue", label: "Blue", hex: "#2b4a7a" },
];
