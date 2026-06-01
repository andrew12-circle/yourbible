import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollMobileInsightPickerIntoView } from "@/lib/framework/scrollMobileInsightPickerIntoView";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("scrollMobileInsightPickerIntoView", () => {
  it("scrolls the mobile pane to the key insights picker below the pinned header", () => {
    document.body.innerHTML = '<div id="scroller"><section id="key-insights"></section></div>';
    const scroller = document.getElementById("scroller") as HTMLElement;
    const target = document.getElementById("key-insights") as HTMLElement;
    const scrollTo = vi.fn();
    scroller.scrollTop = 600;
    scroller.scrollTo = scrollTo;
    scroller.getBoundingClientRect = () => ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0, x: 0, y: 0, toJSON: vi.fn() });
    target.getBoundingClientRect = () => ({ top: 360, right: 0, bottom: 0, left: 0, width: 0, height: 0, x: 0, y: 0, toJSON: vi.fn() });
    vi.stubGlobal("getComputedStyle", () => ({ paddingTop: "280px" }));
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    scrollMobileInsightPickerIntoView(scroller);

    expect(scrollTo).toHaveBeenCalledWith({ top: 680, behavior: "auto" });
  });
});
