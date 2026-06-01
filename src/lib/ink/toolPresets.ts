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
    label: "Fine tip",
    defaultSize: 2,
    pressureRange: { min: 0.85, max: 1.1 },
    opacity: 0.95,
    widthMultiplier: 0.9,
  },
  fountain: {
    id: "fountain",
    label: "Fountain pen",
    defaultSize: 4,
    pressureRange: { min: 0.5, max: 1.65 },
    opacity: 0.92,
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
    defaultSize: 18,
    defaultColor: "#facc15",
    pressureRange: { min: 1, max: 1 },
    opacity: 0.38,
    widthMultiplier: 1.4,
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
  if (tool === "pen") return "fountain";
  if (tool && tool in INK_TOOL_PRESETS) return tool as InkDrawTool;
  return "fountain";
}
