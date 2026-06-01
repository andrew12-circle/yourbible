import { INK_TOOL_PRESETS } from "@/lib/ink/toolPresets";
import type { InkPoint, InkStroke } from "@/lib/ink/types";

const PRESET = INK_TOOL_PRESETS.fountain;

/** Non-linear nib response: light touch stays hairline, firm press swells. */
export function fountainPressureCurve(pressure01: number): number {
  const p = Math.max(0, Math.min(1, pressure01));
  return Math.pow(p, 1.62);
}

/** When pressure is unknown (mouse/touch), infer from stroke speed. */
export function speedPressureFromStepDistance(distance: number): number {
  return Math.max(0.12, Math.min(1, 1.22 - distance / 16));
}

export function isUnknownInkPressure(p: number): boolean {
  return Math.abs(p - 0.5) < 0.04;
}

export function effectiveFountainPressure(pointPressure: number, stepDistance: number): number {
  const speedP = speedPressureFromStepDistance(stepDistance);
  if (isUnknownInkPressure(pointPressure)) return speedP;
  return Math.max(0, Math.min(1, pointPressure * 0.88 + speedP * 0.12));
}

export function fountainWidthAt(
  stroke: InkStroke,
  pressure01: number,
  stepDistance = 0,
): number {
  const { min, max } = PRESET.pressureRange;
  const effective = effectiveFountainPressure(pressure01, stepDistance);
  const curved = fountainPressureCurve(effective);
  const factor = min + (max - min) * curved;
  return stroke.size * PRESET.widthMultiplier * factor;
}

/** Per-point widths with light smoothing for continuous nib feel. */
export function computeFountainWidths(stroke: InkStroke): number[] {
  const pts = stroke.points;
  if (pts.length === 0) return [];

  const raw = pts.map((pt, i) => {
    const prev = i > 0 ? pts[i - 1] : pt;
    const dist = i > 0 ? Math.hypot(pt.x - prev.x, pt.y - prev.y) : 0;
    return fountainWidthAt(stroke, pt.p, dist);
  });

  if (raw.length < 3) return raw;

  return raw.map((w, i) => {
    if (i === 0 || i === raw.length - 1) return w;
    return raw[i - 1]! * 0.18 + w * 0.64 + raw[i + 1]! * 0.18;
  });
}

function fillWidthSegment(
  ctx: CanvasRenderingContext2D,
  a: InkPoint,
  b: InkPoint,
  w0: number,
  w1: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) {
    const r = Math.max(w0, w1) / 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const nx = -dy / len;
  const ny = dx / len;
  const hw0 = w0 / 2;
  const hw1 = w1 / 2;
  ctx.beginPath();
  ctx.moveTo(a.x + nx * hw0, a.y + ny * hw0);
  ctx.lineTo(b.x + nx * hw1, b.y + ny * hw1);
  ctx.lineTo(b.x - nx * hw1, b.y - ny * hw1);
  ctx.lineTo(a.x - nx * hw0, a.y - ny * hw0);
  ctx.closePath();
  ctx.fill();
}

export function drawFountainStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  strokeColor: string,
  baseOpacity: number,
) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  const widths = computeFountainWidths(stroke);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (pts.length === 1) {
    const w = widths[0]!;
    const alpha = baseOpacity * (0.62 + 0.38 * fountainPressureCurve(pts[0]!.p));
    ctx.fillStyle = withAlpha(strokeColor, alpha);
    ctx.beginPath();
    ctx.arc(pts[0]!.x, pts[0]!.y, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const w0 = widths[i - 1]!;
    const w1 = widths[i]!;
    const midP = (effectiveFountainPressure(a.p, 0) + effectiveFountainPressure(b.p, Math.hypot(b.x - a.x, b.y - a.y))) / 2;
    const alpha = baseOpacity * (0.58 + 0.42 * fountainPressureCurve(midP));
    ctx.fillStyle = withAlpha(strokeColor, alpha);
    fillWidthSegment(ctx, a, b, w0, w1);
  }

  const last = pts[pts.length - 1]!;
  const lastW = widths[widths.length - 1]!;
  ctx.fillStyle = withAlpha(strokeColor, baseOpacity);
  ctx.beginPath();
  ctx.arc(last.x, last.y, lastW / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function withAlpha(color: string, alpha: number): string {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m) {
    return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  }
  return color;
}
