import { drawFountainStroke } from "@/lib/ink/fountainStroke";
import { INK_TOOL_PRESETS, normalizeInkDrawTool } from "@/lib/ink/toolPresets";
import type { InkPoint, InkStroke } from "@/lib/ink/types";

export const INK_PEN_SIZES = [2, 4, 6, 10, 16, 20] as const;

export const INK_PEN_COLORS = [
  { name: "Ink", value: "#111827" },
  { name: "Leather", value: "#5c4033" },
  { name: "Red", value: "#dc2626" },
  { name: "Amber", value: "#d97706" },
  { name: "Emerald", value: "#059669" },
  { name: "Sky", value: "#0284c7" },
] as const;

export function strokeWidth(stroke: InkStroke, pressure: number): number {
  const preset = INK_TOOL_PRESETS[normalizeInkDrawTool(stroke.tool)];
  if (stroke.tool === "eraser") return stroke.size * preset.widthMultiplier;
  const { min, max } = preset.pressureRange;
  const factor = min + (max - min) * Math.max(0, Math.min(1, pressure));
  return stroke.size * preset.widthMultiplier * factor;
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  opts?: { penOpacity?: number; colorForStroke?: (hex: string) => string },
) {
  const tool = normalizeInkDrawTool(stroke.tool);
  const normalized: InkStroke = { ...stroke, tool };
  const preset = INK_TOOL_PRESETS[tool];
  const pts = normalized.points;
  if (pts.length === 0) return;

  const baseOpacity = (opts?.penOpacity ?? 1) * preset.opacity;
  const strokeColor =
    opts?.colorForStroke?.(normalized.color) ?? hexWithAlpha(normalized.color, baseOpacity);

  if (tool === "fountain") {
    drawFountainStroke(ctx, normalized, strokeColor, baseOpacity);
    return;
  }

  ctx.lineCap = tool === "highlighter" ? "square" : "round";
  ctx.lineJoin = "round";

  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else if (tool === "highlighter") {
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = strokeColor;
  } else if (tool === "pencil") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = strokeColor;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = strokeColor;
  }

  if (pts.length === 1) {
    const p = pts[0];
    const w = strokeWidth(normalized, p.p);
    ctx.beginPath();
    ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "rgba(0,0,0,1)" : strokeColor;
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const w = strokeWidth(normalized, (a.p + b.p) / 2);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(a.x, a.y, midX, midY);
    ctx.stroke();
  }

  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const wLast = strokeWidth(normalized, last.p);
  ctx.lineWidth = wLast;
  ctx.beginPath();
  ctx.moveTo((prev.x + last.x) / 2, (prev.y + last.y) / 2);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.globalCompositeOperation = "source-over";
}

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function normalizeInkPressure(pressure: number, pointerType: string): number {
  if (pointerType === "pen" && pressure > 0 && pressure <= 1) return pressure;
  if (pressure > 0 && pressure <= 1) return pressure;
  return 0.5;
}

export function getInkPointFromCanvasEvent(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  pressure: number,
  pointerType: string,
): InkPoint {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return { x, y, p: normalizeInkPressure(pressure, pointerType) };
}

export { projectPointOntoRuler, RULER_BAND_HEIGHT } from "@/lib/journal/sketchRuler";
