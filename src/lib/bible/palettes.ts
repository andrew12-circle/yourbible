import type { CSSProperties } from "react";

/** HSL components (without hsl()) for leather CSS variables */
export type CoverLeatherVars = {
  deep: string;
  base: string;
  mid: string;
  light: string;
  highlight: string;
  stitch: string;
};

export interface Cover {
  id: string;
  label: string;
  tagline: string;
  /** Maps to `.leather-cover--{variant}` in CSS */
  variant: string;
  /** Light leather needs dark label text */
  tone: "dark" | "light";
  leather: CoverLeatherVars;
}

/** Distinct leather hues — applied inline so every swatch reads clearly */
export const COVER_LEATHER: Record<string, CoverLeatherVars> = {
  cordovan: {
    deep: "0 58% 11%",
    base: "0 52% 19%",
    mid: "0 54% 27%",
    light: "8 48% 36%",
    highlight: "12 42% 44%",
    stitch: "38 62% 54%",
  },
  burgundy: {
    deep: "355 62% 11%",
    base: "355 58% 19%",
    mid: "355 60% 28%",
    light: "355 55% 38%",
    highlight: "355 50% 46%",
    stitch: "40 58% 58%",
  },
  obsidian: {
    deep: "0 0% 3%",
    base: "0 0% 7%",
    mid: "0 0% 12%",
    light: "0 0% 18%",
    highlight: "42 45% 38%",
    stitch: "43 72% 58%",
  },
  midnight: {
    deep: "225 62% 8%",
    base: "225 58% 14%",
    mid: "225 52% 22%",
    light: "225 48% 32%",
    highlight: "225 42% 42%",
    stitch: "210 35% 62%",
  },
  sage: {
    deep: "152 42% 10%",
    base: "152 38% 17%",
    mid: "152 36% 25%",
    light: "152 32% 34%",
    highlight: "152 28% 42%",
    stitch: "85 28% 48%",
  },
  cognac: {
    deep: "28 50% 12%",
    base: "30 55% 22%",
    mid: "32 58% 30%",
    light: "34 62% 40%",
    highlight: "36 65% 48%",
    stitch: "38 60% 55%",
  },
  espresso: {
    deep: "25 40% 6%",
    base: "25 42% 11%",
    mid: "25 38% 17%",
    light: "28 35% 24%",
    highlight: "30 32% 32%",
    stitch: "35 45% 42%",
  },
  rose: {
    deep: "335 52% 28%",
    base: "335 58% 38%",
    mid: "335 62% 46%",
    light: "335 65% 54%",
    highlight: "335 68% 62%",
    stitch: "350 40% 72%",
  },
  "light-pink": {
    deep: "340 48% 78%",
    base: "340 52% 84%",
    mid: "340 55% 88%",
    light: "340 58% 92%",
    highlight: "340 60% 95%",
    stitch: "340 38% 58%",
  },
  blush: {
    deep: "12 42% 52%",
    base: "12 48% 62%",
    mid: "12 52% 68%",
    light: "14 55% 76%",
    highlight: "16 58% 82%",
    stitch: "8 35% 42%",
  },
  sand: {
    deep: "38 32% 52%",
    base: "40 36% 62%",
    mid: "42 38% 70%",
    light: "44 40% 78%",
    highlight: "46 42% 85%",
    stitch: "32 38% 40%",
  },
};

function cover(
  id: string,
  label: string,
  tagline: string,
  tone: Cover["tone"],
): Cover {
  return {
    id,
    label,
    tagline,
    variant: id,
    tone,
    leather: COVER_LEATHER[id] ?? COVER_LEATHER.cordovan,
  };
}

export const COVERS: Cover[] = [
  cover("cordovan", "Cordovan", "Deep oxblood, classic", "dark"),
  cover("burgundy", "Burgundy", "Rich wine leather", "dark"),
  cover("obsidian", "Obsidian", "Black with gold edges", "dark"),
  cover("midnight", "Midnight Navy", "Deep blue, dignified", "dark"),
  cover("sage", "Forest Sage", "Muted green, grounded", "dark"),
  cover("cognac", "Cognac", "Warm caramel brown", "dark"),
  cover("espresso", "Espresso", "Dark roast brown", "dark"),
  cover("rose", "Rose Pink", "Soft pink leather", "dark"),
  cover("light-pink", "Light Pink", "Pale blossom leather", "light"),
  cover("blush", "Blush", "Warm rose, gentle", "light"),
  cover("sand", "Sand Linen", "Natural tan, light", "light"),
];

export function coverLeatherStyle(leather: CoverLeatherVars): CSSProperties {
  return {
    "--lc-deep": leather.deep,
    "--lc-base": leather.base,
    "--lc-mid": leather.mid,
    "--lc-light": leather.light,
    "--lc-highlight": leather.highlight,
    "--lc-stitch": leather.stitch,
  } as CSSProperties;
}

export interface Palette {
  id: string; label: string; tagline: string;
  /** Highlight color tokens (CSS vars) */
  colors: { name: string; cssVar: string; meaning?: string }[];
}

export const PALETTES: Palette[] = [
  {
    id: "classic",
    label: "Classic Warm",
    tagline: "The warm journaling staples",
    colors: [
      { name: "Amber", cssVar: "--hl-amber", meaning: "Promise" },
      { name: "Peach", cssVar: "--hl-peach", meaning: "Identity" },
      { name: "Sage", cssVar: "--hl-sage", meaning: "Wisdom" },
      { name: "Yellow", cssVar: "--hl-yellow", meaning: "Light" },
      { name: "Coral", cssVar: "--hl-coral", meaning: "Joy" },
      { name: "Clay", cssVar: "--hl-clay", meaning: "Earth" },
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
      { name: "Mint", cssVar: "--hl-mint", meaning: "Renewal" },
      { name: "Lavender", cssVar: "--hl-lavender", meaning: "Peace" },
      { name: "Peach", cssVar: "--hl-peach", meaning: "Identity" },
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
      { name: "Teal", cssVar: "--hl-teal", meaning: "Living water" },
      { name: "Coral", cssVar: "--hl-coral", meaning: "Fire" },
    ],
  },
  {
    id: "all",
    label: "Full Set",
    tagline: "Every color, no rules",
    colors: [
      { name: "Yellow", cssVar: "--hl-yellow" },
      { name: "Amber", cssVar: "--hl-amber" },
      { name: "Peach", cssVar: "--hl-peach" },
      { name: "Coral", cssVar: "--hl-coral" },
      { name: "Rose", cssVar: "--hl-rose" },
      { name: "Lavender", cssVar: "--hl-lavender" },
      { name: "Violet", cssVar: "--hl-violet" },
      { name: "Sky", cssVar: "--hl-sky" },
      { name: "Teal", cssVar: "--hl-teal" },
      { name: "Mint", cssVar: "--hl-mint" },
      { name: "Sage", cssVar: "--hl-sage" },
      { name: "Clay", cssVar: "--hl-clay" },
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
