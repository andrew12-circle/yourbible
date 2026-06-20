import { describe, expect, it } from "vitest";
import { spreadCropLeftInsetCss, spreadCropWidthCss, spreadCropWidthRatio, SPREAD_RIGHT_PEEK } from "./spreadCrop";

describe("spreadCrop", () => {
  it("keeps a sliver of the right page visible", () => {
    expect(spreadCropWidthRatio(0.25)).toBeCloseTo(1.6);
    expect(spreadCropWidthRatio(SPREAD_RIGHT_PEEK)).toBeGreaterThan(1);
  });

  it("returns a calc width for CSS", () => {
    expect(spreadCropWidthCss(0.25, true)).toBe("calc(100% * 1.6)");
    expect(spreadCropWidthCss(0.25, false, "0.5rem")).toBe(
      "calc((100vw - (0.5rem)) * 1.6 + (0.5rem))",
    );
  });

  it("uses no left inset in the hub embed", () => {
    expect(spreadCropLeftInsetCss(true, false)).toBe("0px");
  });
});
