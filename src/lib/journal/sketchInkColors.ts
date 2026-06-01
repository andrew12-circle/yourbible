export type SketchPenColor = { name: string; value: string };

export const DAY_PEN_COLORS: SketchPenColor[] = [
  { name: "Ink", value: "#111827" },
  { name: "Slate", value: "#64748b" },
  { name: "Red", value: "#dc2626" },
  { name: "Amber", value: "#d97706" },
  { name: "Emerald", value: "#059669" },
  { name: "Sky", value: "#0284c7" },
  { name: "Indigo", value: "#4338ca" },
  { name: "Rose", value: "#e11d48" },
];

export const NIGHT_PEN_COLORS: SketchPenColor[] = [
  { name: "Ink", value: "#f8fafc" },
  { name: "Slate", value: "#cbd5e1" },
  { name: "Red", value: "#fb7185" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Emerald", value: "#34d399" },
  { name: "Sky", value: "#60a5fa" },
  { name: "Indigo", value: "#a78bfa" },
  { name: "Rose", value: "#f472b6" },
];

export function getSketchPenColors(isNightMode: boolean): SketchPenColor[] {
  return isNightMode ? NIGHT_PEN_COLORS : DAY_PEN_COLORS;
}

/** Map legacy day/night palette entries; pass through toolbar/custom hex as-is. */
export function mappedSketchColorForMode(color: string, isNightMode: boolean): string {
  const targetColors = getSketchPenColors(isNightMode);
  if (targetColors.some((c) => c.value === color)) return color;
  const source = [...DAY_PEN_COLORS, ...NIGHT_PEN_COLORS].find((c) => c.value === color);
  if (!source) return color;
  return targetColors.find((c) => c.name === source.name)?.value ?? color;
}
