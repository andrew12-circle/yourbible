import { describe, expect, it } from "vitest";
import { denormalizeStrokes, normalizeStrokes } from "@/lib/ink/strokeCoords";
import type { InkStroke } from "@/lib/ink/types";

const sampleStroke = (): InkStroke => ({
  tool: "pen",
  color: "#111827",
  size: 4,
  points: [
    { x: 100, y: 200, p: 0.5 },
    { x: 150, y: 250, p: 0.8 },
  ],
});

describe("strokeCoords", () => {
  it("round-trips strokes through normalize and denormalize", () => {
    const stroke = sampleStroke();
    const normalized = normalizeStrokes([stroke], 400, 800);
    const restored = denormalizeStrokes(normalized, 400, 800);
    expect(restored[0].points[0].x).toBeCloseTo(100, 5);
    expect(restored[0].points[0].y).toBeCloseTo(200, 5);
    expect(restored[0].points[1].x).toBeCloseTo(150, 5);
    expect(restored[0].points[1].y).toBeCloseTo(250, 5);
  });

  it("returns empty normalized and denormalized strokes for invalid canvas size", () => {
    expect(normalizeStrokes([sampleStroke()], 0, 0)).toEqual([]);
    const normalized = normalizeStrokes([sampleStroke()], 400, 800);
    expect(denormalizeStrokes(normalized, 0, 0)).toEqual([]);
  });
});
