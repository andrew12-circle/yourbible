import { describe, expect, it } from "vitest";
import {
  buildRulerMarks,
  projectPointOntoRuler,
  RULER_BAND_HEIGHT,
  RULER_UNIT_PX,
  rulerSpanLength,
} from "./sketchRuler";
describe("sketchRuler", () => {
  it("spans past canvas corners", () => {
    expect(rulerSpanLength(300, 400)).toBeGreaterThan(500);
  });

  it("aligns numbers with major ticks at fixed unit spacing", () => {
    const marks = buildRulerMarks(RULER_UNIT_PX * 12);
    const majors = marks.filter((m) => m.kind === "major");
    expect(majors[0]).toMatchObject({ x: 0, label: 1 });
    expect(majors[7]).toMatchObject({ x: RULER_UNIT_PX * 7, label: 8 });
    expect(majors[8]).toMatchObject({ x: RULER_UNIT_PX * 8, label: 9 });
    const labeled = marks.filter((m) => m.label != null);
    for (const m of labeled) {
      expect(m.kind).toBe("major");
    }
  });

  it("snaps to ruler edge, not center", () => {
    const half = RULER_BAND_HEIGHT / 2;
    const cx = 100;
    const cy = 100;
    // Horizontal ruler; point above center line should snap to top edge
    const top = projectPointOntoRuler(150, 80, cx, cy, 0);
    expect(top.y).toBeCloseTo(cy - half, 5);
    expect(top.x).toBeCloseTo(150, 5);

    // Point below center snaps to bottom edge
    const bottom = projectPointOntoRuler(150, 130, cx, cy, 0);
    expect(bottom.y).toBeCloseTo(cy + half, 5);
  });
});
