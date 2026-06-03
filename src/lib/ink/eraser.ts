import { INK_TOOL_PRESETS } from "@/lib/ink/toolPresets";
import type { InkPoint, InkStroke } from "@/lib/ink/types";

/** Eraser diameter steps (before width multiplier). */
export const INK_ERASER_SIZES = [16, 24, 36, 52, 72, 96] as const;

export function eraserRadiusFromSize(size: number): number {
  return (size * INK_TOOL_PRESETS.eraser.widthMultiplier) / 2;
}

function pointNearEraserSample(
  px: number,
  py: number,
  sample: InkPoint,
  radius: number,
): boolean {
  const dx = px - sample.x;
  const dy = py - sample.y;
  return dx * dx + dy * dy <= radius * radius;
}

/** True when any stroke point lies inside the eraser brush along the drag path. */
export function strokeHitByEraser(
  stroke: InkStroke,
  eraserPoints: InkPoint[],
  radius: number,
): boolean {
  if (eraserPoints.length === 0 || stroke.points.length === 0) return false;
  for (const p of stroke.points) {
    for (const e of eraserPoints) {
      if (pointNearEraserSample(p.x, p.y, e, radius)) return true;
    }
  }
  return false;
}

export function filterStrokesByEraser(
  strokes: InkStroke[],
  eraserPoints: InkPoint[],
  eraserSize: number,
): InkStroke[] {
  if (eraserPoints.length === 0) return strokes;
  const radius = eraserRadiusFromSize(eraserSize);
  return strokes.filter((s) => s.tool !== "eraser" && !strokeHitByEraser(s, eraserPoints, radius));
}

export function nextInkEraserSize(current: number): number {
  const sizes = [...INK_ERASER_SIZES];
  const idx = sizes.indexOf(current as (typeof sizes)[number]);
  if (idx >= 0) return sizes[(idx + 1) % sizes.length]!;
  const next = sizes.find((s) => s > current);
  return next ?? sizes[0]!;
}
