import { describe, expect, it } from "vitest";
import { mobileSheetSafeTop, mobileVisualViewportPageStyle } from "./mobileShellClasses";

describe("mobileSheetSafeTop", () => {
  it("adds safe-area inset with a minimum top gutter", () => {
    expect(mobileSheetSafeTop()).toBe(
      "pt-[calc(max(1rem,var(--safe-area-inset-top))+0.75rem)]",
    );
    expect(mobileSheetSafeTop(0.5)).toBe(
      "pt-[calc(max(1rem,var(--safe-area-inset-top))+0.5rem)]",
    );
  });
});

describe("mobileVisualViewportPageStyle", () => {
  it("returns undefined when keyboard is closed", () => {
    expect(
      mobileVisualViewportPageStyle({
        keyboardInset: 0,
        offsetTop: 0,
        viewportHeight: 800,
      }),
    ).toBeUndefined();
  });

  it("pins height and offset when keyboard is open", () => {
    expect(
      mobileVisualViewportPageStyle({
        keyboardInset: 280,
        offsetTop: 44,
        viewportHeight: 476,
      }),
    ).toEqual({
      height: 476,
      maxHeight: 476,
      transform: "translateY(44px)",
      transition: "transform 120ms ease-out, height 120ms ease-out",
    });
  });
});
