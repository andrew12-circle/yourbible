import { describe, expect, it } from "vitest";
import {
  mobileBottomDockPadding,
  mobileBottomDockStyle,
  mobileSheetSafeTop,
  mobileVisualViewportPageStyle,
} from "./mobileShellClasses";

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

describe("mobileBottomDockPadding", () => {
  it("includes safe-area when keyboard is closed", () => {
    expect(mobileBottomDockPadding("0.5rem", 0)).toEqual({
      paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)",
    });
  });

  it("uses minimal padding when keyboard is open", () => {
    expect(mobileBottomDockPadding("0.5rem", 280)).toEqual({
      paddingBottom: "0.5rem",
    });
  });
});

describe("mobileBottomDockStyle", () => {
  it("combines padding and transform when keyboard is open", () => {
    expect(mobileBottomDockStyle({ keyboardInset: 256, extraPadding: "0.5rem" })).toEqual({
      paddingBottom: "0.5rem",
      transform: "translateY(-256px)",
      transition: "transform 120ms ease-out",
    });
  });
});
