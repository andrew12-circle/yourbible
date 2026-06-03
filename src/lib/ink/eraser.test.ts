import { describe, expect, it } from "vitest";
import { filterStrokesByEraser, strokeHitByEraser } from "./eraser";
import type { InkStroke } from "./types";

describe("eraser", () => {
  const stroke: InkStroke = {
    tool: "fountain",
    color: "#000",
    size: 4,
    points: [
      { x: 10, y: 10, p: 0.5 },
      { x: 50, y: 50, p: 0.5 },
    ],
  };

  it("detects strokes under the eraser path", () => {
    expect(strokeHitByEraser(stroke, [{ x: 12, y: 12, p: 1 }], 20)).toBe(true);
    expect(strokeHitByEraser(stroke, [{ x: 200, y: 200, p: 1 }], 20)).toBe(false);
  });

  it("removes hit strokes", () => {
    const next = filterStrokesByEraser([stroke], [{ x: 10, y: 10, p: 1 }], 36);
    expect(next).toHaveLength(0);
  });
});
