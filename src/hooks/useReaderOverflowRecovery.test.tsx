import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReaderOverflowRecovery } from "./useReaderOverflowRecovery";
const fit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/bible/readerVisibleFit", () => ({ readerVisibleFit: fit }));
let resize: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  fit.mockReturnValue({ fits: false, overflowPx: 3 });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {} unobserve() {} disconnect() {}
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(0), 1));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  document.body.innerHTML = '<div data-bible-reader><div data-reader-page-side="left"><article data-reading-area data-reader-overflow><span data-verse-id="1">one</span><span data-verse-id="2">two</span></article></div></div>';
});
afterEach(() => { cleanup(); document.body.innerHTML = ""; vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
const check = () => act(() => { resize?.(); vi.advanceTimersByTime(2); });
describe("book-page overflow recovery", () => {
  it("re-paginates a small ordinary mismatch once without enabling scrolling", () => {
    const correction = vi.fn();
    const { result } = renderHook(() => useReaderOverflowRecovery("layout", correction, true));
    check(); check();
    expect(correction).toHaveBeenCalledTimes(1);
    expect(correction).toHaveBeenCalledWith(3);
    expect(result.current).toEqual({});
    expect(document.querySelector("article")!.hasAttribute("data-reader-overflow")).toBe(false);
    expect(document.querySelector("article")!.getAttribute("style")).toBeNull();
  });
  it("requires an explicit choice for an oversized unit and clears it when the unit fits", () => {
    document.querySelector('[data-verse-id="2"]')!.remove();
    const correction = vi.fn();
    const { result } = renderHook(() => useReaderOverflowRecovery("layout", correction, true));
    check();
    expect(result.current).toEqual({left: "oversized"});
    expect(correction).not.toHaveBeenCalled();
    fit.mockReturnValue({fits:true, overflowPx:0}); check();
    expect(result.current).toEqual({});
  });
  it("never changes a held or explicitly scrolling page", () => {
    document.querySelector('[data-reader-page-side]')!.setAttribute("inert", "");
    const correction = vi.fn();
    renderHook(() => useReaderOverflowRecovery("layout", correction, true)); check();
    expect(fit).not.toHaveBeenCalled();
    expect(correction).not.toHaveBeenCalled();
  });
});
