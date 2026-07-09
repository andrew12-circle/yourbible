import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isReaderSinglePageLayout, isReaderSpreadLayout } from "@/lib/viewport/layoutMode";
import {
  MINI_PHONE_LAYOUT_HEIGHT_VAR,
  MINI_PHONE_LAYOUT_SCALE_VAR,
  MINI_PHONE_LAYOUT_WIDTH_VAR,
  readEffectiveLayoutViewport,
  readMiniPhoneLayoutViewport,
} from "./miniPhoneLayoutViewport";

describe("miniPhoneLayoutViewport", () => {
  let root: HTMLDivElement | null = null;

  beforeEach(() => {
    root = document.createElement("div");
    root.setAttribute("data-mini-phone-app", "");
    root.style.setProperty(MINI_PHONE_LAYOUT_WIDTH_VAR, "430px");
    root.style.setProperty(MINI_PHONE_LAYOUT_HEIGHT_VAR, "900px");
    root.style.setProperty(MINI_PHONE_LAYOUT_SCALE_VAR, "0.75");
    document.body.appendChild(root);
  });

  afterEach(() => {
    root?.remove();
    root = null;
  });

  it("reads logical mini-phone dimensions from CSS vars", () => {
    expect(readMiniPhoneLayoutViewport()).toEqual({
      width: 430,
      height: 900,
      landscape: false,
    });
  });

  it("prefers mini-phone viewport in readEffectiveLayoutViewport", () => {
    expect(readEffectiveLayoutViewport()).toEqual({
      width: 430,
      height: 900,
      landscape: false,
    });
  });

  it("uses single-page reader layout inside mini phone", () => {
    const size = readEffectiveLayoutViewport();
    expect(isReaderSinglePageLayout(size)).toBe(true);
    expect(isReaderSpreadLayout(size)).toBe(false);
  });
});
