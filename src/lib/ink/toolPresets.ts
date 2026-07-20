import type { InkDrawTool } from "@/lib/ink/types";

export type InkToolPreset = {
  id: InkDrawTool;
  label: string;
  defaultSize: number;
  defaultColor?: string;
  pressureRange: { min: number; max: number };
  opacity: number;
  widthMultiplier: number;
};

/** Drawing tools stored on strokes (excludes ruler / lasso UI modes). */
export const INK_DRAW_TOOLS: InkDrawTool[] = [
  "pencil",
  "fineline",
  "fountain",
  "marker",
  "highlighter",
  "eraser",
];

export const INK_TOOL_PRESETS: Record<InkDrawTool, InkToolPreset> = {
  pencil: {
    id: "pencil",
    label: "Pencil",
    defaultSize: 3,
    pressureRange: { min: 0.45, max: 1.35 },
    opacity: 0.78,
    widthMultiplier: 1,
  },
  fineline: {
    id: "fineline",
    label: "Pen",
    /** Third line-weight step in INK_PEN_SIZES ([2, 4, 6, …]). */
    defaultSize: 6,
    pressureRange: { min: 0.85, max: 1.1 },
    opacity: 0.95,
    widthMultiplier: 0.9,
  },
  /** Legacy pressure nib — kept for older strokes; not offered in the toolbar. */
  fountain: {
    id: "fountain",
    label: "Fountain pen",
    defaultSize: 4,
    /** Hairline at light touch, broad swell when pressed (see fountainStroke.ts). */
    pressureRange: { min: 0.1, max: 2.35 },
    opacity: 0.94,
    widthMultiplier: 1,
  },
  marker: {
    id: "marker",
    label: "Marker",
    defaultSize: 8,
    pressureRange: { min: 0.9, max: 1.15 },
    opacity: 0.88,
    widthMultiplier: 1.15,
  },
  highlighter: {
    id: "highlighter",
    label: "Highlighter",
    defaultSize: 14,
    defaultColor: "#fef08a",
    pressureRange: { min: 1, max: 1 },
    opacity: 0.42,
    widthMultiplier: 1.05,
  },
  eraser: {
    id: "eraser",
    label: "Eraser",
    defaultSize: 14,
    pressureRange: { min: 1, max: 1 },
    opacity: 1,
    widthMultiplier: 2.5,
  },
};

export function normalizeInkDrawTool(tool: string | undefined): InkDrawTool {
  if (tool === "pen") return "fineline";
  if (tool && tool in INK_TOOL_PRESETS) return tool as InkDrawTool;
  return "fineline";
}
