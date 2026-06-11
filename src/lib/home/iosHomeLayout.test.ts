import { describe, expect, it } from "vitest";
import {
  IOS_HOME_SCREEN_WIDTH,
  iosHomeGridGapX,
  iosHomeRowStride,
  iosScaledPx,
} from "@/lib/home/iosHomeLayout";

describe("iosHomeLayout", () => {
  it("scales grid icons to iPhone proportions", () => {
    expect(iosScaledPx(IOS_HOME_SCREEN_WIDTH, 60)).toBe(60);
    expect(iosScaledPx(288, 60)).toBe(44);
  });

  it("scales grid gaps with viewport width", () => {
    expect(iosHomeGridGapX(IOS_HOME_SCREEN_WIDTH)).toBe(19);
    expect(iosHomeGridGapX(288)).toBeGreaterThanOrEqual(8);
  });

  it("computes row stride from viewport width", () => {
    expect(iosHomeRowStride(288)).toBeGreaterThan(50);
    expect(iosHomeRowStride(393)).toBeGreaterThan(80);
  });
});
