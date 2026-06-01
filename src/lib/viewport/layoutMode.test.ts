import { describe, expect, it } from "vitest";
import {
  isCompactInkLayout,
  isReaderSinglePageLayout,
  isReaderSpreadLayout,
  isTabletPortraitLayout,
  type ViewportSize,
} from "./layoutMode";

function vp(width: number, height: number, landscape = width > height): ViewportSize {
  return { width, height, landscape };
}

describe("layoutMode", () => {
  it("keeps phones on single-page layout in any orientation", () => {
    expect(isReaderSinglePageLayout(vp(390, 844, false))).toBe(true);
    expect(isReaderSinglePageLayout(vp(844, 390, true))).toBe(true);
  });

  it("uses spread layout for iPad landscape", () => {
    expect(isReaderSpreadLayout(vp(1194, 834, true))).toBe(true);
    expect(isReaderSinglePageLayout(vp(1194, 834, true))).toBe(false);
  });

  it("uses single-page layout for iPad portrait including 12.9-inch width", () => {
    expect(isReaderSinglePageLayout(vp(1024, 1366, false))).toBe(true);
    expect(isReaderSpreadLayout(vp(1024, 1366, false))).toBe(false);
    expect(isTabletPortraitLayout(vp(1024, 1366, false))).toBe(true);
  });

  it("uses spread layout on large desktop portrait monitors", () => {
    expect(isReaderSpreadLayout(vp(1440, 900, false))).toBe(true);
  });

  it("treats compact ink the same as single-page reader chrome", () => {
    expect(isCompactInkLayout(vp(834, 1194, false))).toBe(true);
    expect(isCompactInkLayout(vp(1194, 834, true))).toBe(false);
  });
});
