import type { InkPoint, InkStroke } from "@/lib/ink/types";

export const INK_PEN_SIZES = [2, 4, 6, 10, 16] as const;

export const INK_PEN_COLORS = [
  { name: "Ink", value: "#111827" },
  { name: "Leather", value: "#5c4033" },
  { name: "Red", value: "#dc2626" },
  { name: "Amber", value: "#d97706" },
  { name: "Emerald", value: "#059669" },
  { name: "Sky", value: "#0284c7" },
] as const;

export function strokeWidth(stroke: InkStroke, pressure: number): number {
  if (stroke.tool === "eraser") return stroke.size * 2.5;
  const min = 0.5;
  const max = 1.6;
  const factor = min + (max - min) * Math.max(0, Math.min(1, pressure));
  return stroke.size * factor;
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  opts?: { penOpacity?: number; colorForStroke?: (hex: string) => string },
) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  const penOpacity = opts?.penOpacity ?? 0.92;
  const strokeColor =
    opts?.colorForStroke?.(stroke.color) ?? hexWithAlpha(stroke.color, penOpacity);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = strokeColor;
  }

  if (pts.length === 1) {
    const p = pts[0];
    const w = strokeWidth(stroke, p.p);
    ctx.beginPath();
    ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : strokeColor;
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const w = strokeWidth(stroke, (a.p + b.p) / 2);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(a.x, a.y, midX, midY);
    ctx.stroke();
  }

  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const wLast = strokeWidth(stroke, last.p);
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
  const p =
    pointerType === "pen" && pressure > 0 && pressure <= 1
      ? pressure
      : pressure > 0 && pressure <= 1
        ? pressure
        : 0.5;
  return { x, y, p };
}
