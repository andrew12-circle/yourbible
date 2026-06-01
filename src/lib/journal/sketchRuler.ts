import type { InkPoint } from "@/lib/ink/types";

/** Visible thickness of the ruler band (matches overlay). */
export const RULER_BAND_HEIGHT = 44;

/** Distance between numbered inch-style marks along the ruler (CSS px). */
export const RULER_UNIT_PX = 28;

/** Subdivisions between numbers (4 = quarter-unit minor ticks). */
export const RULER_SUBDIVISIONS = 4;

export type RulerMarkKind = "major" | "half" | "minor";

export type RulerMark = {
  x: number;
  kind: RulerMarkKind;
  /** 1-based label on major marks only */
  label?: number;
};

/** Tick marks and labels on a fixed scale so numbers sit on major graduations. */
export function buildRulerMarks(lengthPx: number): RulerMark[] {
  const marks: RulerMark[] = [];
  const step = RULER_UNIT_PX / RULER_SUBDIVISIONS;
  if (step <= 0 || lengthPx <= 0) return marks;

  let i = 0;
  for (let x = 0; x <= lengthPx + 0.001; x += step, i++) {
    const isMajor = i % RULER_SUBDIVISIONS === 0;
    const isHalf = !isMajor && i % (RULER_SUBDIVISIONS / 2) === 0;
    const kind: RulerMarkKind = isMajor ? "major" : isHalf ? "half" : "minor";
    marks.push({
      x,
      kind,
      label: isMajor ? Math.round(x / RULER_UNIT_PX) + 1 : undefined,
    });
  }
  return marks;
}

/** Length needed for a ruler centered on the canvas to reach past all corners. */
export function rulerSpanLength(width: number, height: number): number {
  return Math.hypot(width, height) + 96;
}

/** Snap to the nearer long edge of the ruler band (not the center line). */
export function projectPointOntoRuler(
  x: number,
  y: number,
  cx: number,
  cy: number,
  angleDeg: number,
  bandHeight: number = RULER_BAND_HEIGHT,
): InkPoint {
  const half = bandHeight / 2;
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const nx = -dy;
  const ny = dx;

  const vx = x - cx;
  const vy = y - cy;
  const t = vx * dx + vy * dy;
  const perp = vx * nx + vy * ny;

  const edgeOffset =
    Math.abs(perp - half) <= Math.abs(perp + half) ? half : -half;

  return {
    x: cx + t * dx + edgeOffset * nx,
    y: cy + t * dy + edgeOffset * ny,
    p: 0.5,
  };
}
