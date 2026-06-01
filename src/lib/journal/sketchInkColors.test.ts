import { describe, expect, it } from "vitest";
import { mappedSketchColorForMode } from "./sketchInkColors";

describe("mappedSketchColorForMode", () => {
  it("keeps toolbar palette colors instead of remapping to ink", () => {
    expect(mappedSketchColorForMode("#007aff", false)).toBe("#007aff");
    expect(mappedSketchColorForMode("#ff3b30", true)).toBe("#ff3b30");
  });

  it("maps day ink to night ink when switching themes", () => {
    expect(mappedSketchColorForMode("#111827", true)).toBe("#f8fafc");
  });
});
