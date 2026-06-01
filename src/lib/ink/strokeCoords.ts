import type { InkStroke, StoredInkStroke } from "@/lib/ink/types";

export function normalizeStrokes(strokes: InkStroke[], width: number, height: number): StoredInkStroke[] {
  if (width <= 0 || height <= 0) return [];
  return strokes.map((s) => ({
    ...s,
    points: s.points.map((p) => ({
      x: p.x / width,
      y: p.y / height,
      p: p.p,
    })),
  }));
}

export function denormalizeStrokes(stored: StoredInkStroke[], width: number, height: number): InkStroke[] {
  if (width <= 0 || height <= 0) return [];
  return stored.map((s) => ({
    ...s,
    points: s.points.map((p) => ({
      x: p.x * width,
      y: p.y * height,
      p: p.p,
    })),
  }));
}

export function cloneStrokes(strokes: InkStroke[]): InkStroke[] {
  return strokes.map((s) => ({
    ...s,
    points: s.points.map((p) => ({ ...p })),
  }));
}
