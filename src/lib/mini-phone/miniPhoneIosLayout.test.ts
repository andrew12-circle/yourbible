import { describe, expect, it } from "vitest";
import {
  IOS_HOME_SCREEN_WIDTH,
  iosScaledPx,
  iosWallpaperBlurPx,
  miniPhoneRowStride,
} from "./miniPhoneIosLayout";

describe("miniPhoneIosLayout", () => {
  it("scales grid icons to iPhone proportions", () => {
    expect(iosScaledPx(IOS_HOME_SCREEN_WIDTH, 60)).toBe(60);
    expect(iosScaledPx(288, 60)).toBe(44);
  });

  it("enforces a minimum wallpaper blur on the mini phone", () => {
    expect(iosWallpaperBlurPx(288, 0)).toBeGreaterThan(0);
    expect(iosWallpaperBlurPx(288, 20)).toBe(20);
  });

  it("computes row stride from phone width", () => {
    expect(miniPhoneRowStride(288)).toBeGreaterThan(50);
    expect(miniPhoneRowStride(393)).toBeGreaterThan(80);
  });
});
