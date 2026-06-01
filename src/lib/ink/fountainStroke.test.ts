import { describe, expect, it } from "vitest";
import {
  computeFountainWidths,
  fountainPressureCurve,
  fountainWidthAt,
} from "./fountainStroke";
import type { InkStroke } from "./types";

const stroke = (points: { x: number; y: number; p: number }[]): InkStroke => ({
  tool: "fountain",
  color: "#111827",
  size: 4,
  points,
});

describe("fountainStroke", () => {
  it("keeps light pressure much thinner than heavy pressure", () => {
    const light = fountainWidthAt(stroke([{ x: 0, y: 0, p: 0.15 }]), 0.15);
    const heavy = fountainWidthAt(stroke([{ x: 0, y: 0, p: 1 }]), 1);
    expect(light).toBeLessThan(heavy * 0.45);
  });

  it("uses a non-linear pressure curve", () => {
    expect(fountainPressureCurve(0.5)).toBeLessThan(0.5);
  });

  it("tapers width on fast finger strokes", () => {
    const slow = fountainWidthAt(stroke([{ x: 0, y: 0, p: 0.5 }]), 0.5, 2);
    const fast = fountainWidthAt(stroke([{ x: 0, y: 0, p: 0.5 }]), 0.5, 24);
    expect(fast).toBeLessThan(slow);
  });

  it("smooths widths along a stroke", () => {
    const widths = computeFountainWidths(
      stroke([
        { x: 0, y: 0, p: 0.2 },
        { x: 10, y: 0, p: 1 },
        { x: 20, y: 0, p: 0.2 },
      ]),
    );
    expect(widths[1]).toBeGreaterThan(widths[0]!);
    expect(widths[1]).toBeGreaterThan(widths[2]!);
  });
});
