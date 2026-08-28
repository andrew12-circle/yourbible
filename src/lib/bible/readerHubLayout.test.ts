import { describe, expect, it } from "vitest";
import {
  readerChromeTopClass,
  readerHeaderSafePaddingClass,
  readerMobilePageTurnBottomClass,
  readerMobileSceneBottomClass,
} from "@/lib/bible/readerHubLayout";

describe("mobile reader bottom offsets", () => {
  it("only reserves the app dock when it is mounted", () => {
    expect(readerMobileSceneBottomClass(true)).toBe("bottom-[var(--reader-mobile-dock-h,5.5rem)]");
    expect(readerMobileSceneBottomClass(false)).toBe("bottom-0");
  });

  it("keeps edge turn targets clear of visible mobile chrome", () => {
    expect(readerMobilePageTurnBottomClass(true, true)).toBe(
      "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+1rem)]",
    );
    expect(readerMobilePageTurnBottomClass(false, true)).toBe(
      "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
    );
    expect(readerMobilePageTurnBottomClass(false, false)).toBe("bottom-safe-16");
  });
});

describe("reader top safe area", () => {
  it("keeps hub reader controls below the iPhone status area", () => {
    expect(readerChromeTopClass(true)).toBe(
      "top-[max(0.5rem,var(--safe-area-inset-top))]",
    );
    expect(readerHeaderSafePaddingClass(true)).toBe(
      "pt-[max(0.5rem,var(--safe-area-inset-top))]",
    );
  });

  it("retains standalone reader safe-area positioning", () => {
    expect(readerChromeTopClass(false)).toBe(
      "top-[calc(var(--safe-area-inset-top)+0.35rem)]",
    );
    expect(readerHeaderSafePaddingClass(false)).toBe(
      "pt-[var(--safe-area-inset-top)]",
    );
  });
});
