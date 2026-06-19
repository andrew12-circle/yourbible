import { describe, expect, it } from "vitest";
import { readVisualViewportMetricsForTest } from "@/hooks/useKeyboardInset";

describe("readVisualViewportMetricsForTest", () => {
  it("returns zero when keyboard is not open", () => {
    expect(
      readVisualViewportMetricsForTest({
        innerHeight: 800,
        vvHeight: 800,
        vvOffsetTop: 0,
      }),
    ).toEqual({ keyboardInset: 0, offsetTop: 0, viewportHeight: 800 });
  });

  it("returns inset and offset when keyboard is open", () => {
    expect(
      readVisualViewportMetricsForTest({
        innerHeight: 800,
        vvHeight: 500,
        vvOffsetTop: 44,
      }),
    ).toEqual({ keyboardInset: 256, offsetTop: 44, viewportHeight: 500 });
  });
});
