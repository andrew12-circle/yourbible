import { describe, expect, it } from "vitest";
import {
  MINI_PHONE_LAYOUT_WIDTH,
  iosScaledPx,
  iosWallpaperBlurPx,
  miniPhoneRowStride,
} from "./miniPhoneIosLayout";

describe("miniPhoneIosLayout", () => {
  it("scales grid icons to iPhone Pro Max proportions", () => {
    expect(iosScaledPx(MINI_PHONE_LAYOUT_WIDTH, 60)).toBe(60);
    expect(iosScaledPx(323, 60)).toBe(45);
  });

  it("enforces a minimum wallpaper blur on the mini phone", () => {
    const scaledMin = Math.round((323 * 36) / MINI_PHONE_LAYOUT_WIDTH);
    expect(iosWallpaperBlurPx(323, 0)).toBe(scaledMin);
    expect(iosWallpaperBlurPx(323, 20)).toBe(scaledMin);
  });

  it("computes row stride from phone width", () => {
    expect(miniPhoneRowStride(323)).toBeGreaterThan(50);
    expect(miniPhoneRowStride(MINI_PHONE_LAYOUT_WIDTH)).toBeGreaterThan(80);
  });
});
