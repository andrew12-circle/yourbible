import { describe, expect, it } from "vitest";
import {
  IPHONE_PRO_MAX_HEIGHT_PT,
  IPHONE_PRO_MAX_WIDTH_PT,
  MINI_PHONE_ASPECT,
  defaultMiniPhoneSize,
  fitMiniPhoneSize,
  miniPhoneHeightForWidth,
  miniPhoneWidthForHeight,
} from "./miniPhoneDimensions";

describe("miniPhoneDimensions", () => {
  it("matches iPhone Pro Max aspect ratio", () => {
    expect(MINI_PHONE_ASPECT).toBeCloseTo(IPHONE_PRO_MAX_HEIGHT_PT / IPHONE_PRO_MAX_WIDTH_PT, 5);
    expect(miniPhoneHeightForWidth(430)).toBe(932);
    expect(miniPhoneWidthForHeight(932)).toBe(430);
  });

  it("preserves aspect when fitting width", () => {
    const { w, h } = fitMiniPhoneSize(430, { maxHeight: 800 });
    expect(h).toBeLessThanOrEqual(800);
    expect(h / w).toBeCloseTo(MINI_PHONE_ASPECT, 2);
  });

  it("default size uses Pro Max ratio", () => {
    const { w, h } = defaultMiniPhoneSize(1200);
    expect(h / w).toBeCloseTo(MINI_PHONE_ASPECT, 2);
  });
});
