import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReaderPageMeasurement } from "./useReaderPageMeasurement";

let root: HTMLElement;
let width = 530, height = 730;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 1));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  root = document.createElement("section");
  root.setAttribute("data-bible-reader", "");
  root.innerHTML = '<div data-reader-page-side="left"><article data-reading-area></article></div><div data-reader-page-side="right"><article data-reading-area></article></div>';
  for (const article of root.querySelectorAll("article")) {
    Object.defineProperty(article, "clientWidth", { configurable: true, get: () => width });
    Object.defineProperty(article, "clientHeight", { configurable: true, get: () => height });
  }
  width = 530; height = 730;
  document.body.append(root);
});
afterEach(() => { cleanup(); root.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("live reader measurement after page replacement", () => {
  it("remeasures the current pages even after an old page clears its ref", () => {
    const { result } = renderHook(() => useReaderPageMeasurement("Mrk", 3));
    act(() => { result.current.onMeasureRestRef(root.querySelectorAll("article")[1]); vi.runOnlyPendingTimers(); });
    expect(result.current.pageBox).toEqual({ w: 530, h: 730 });
    act(() => {
      result.current.onMeasureFirstRef(null);
      result.current.onMeasureRestRef(null);
      width = 490; height = 694;
      window.dispatchEvent(new Event("resize"));
      vi.runOnlyPendingTimers();
    });
    expect(result.current.pageBox).toEqual({ w: 490, h: 694 });
  });
  it("ignores a detached old article instead of reusing its stale dimensions", () => {
    const old = document.createElement("article");
    Object.defineProperty(old, "clientWidth", { value: 1000 });
    Object.defineProperty(old, "clientHeight", { value: 1000 });
    const { result } = renderHook(() => useReaderPageMeasurement("Psa", 6));
    act(() => { result.current.onMeasureRestRef(old); vi.runOnlyPendingTimers(); });
    expect(result.current.pageBox).toEqual({ w: 530, h: 730 });
  });
  it("does not size a cropped single page from the hidden right-page preview", () => {
    root.setAttribute("data-cropped-spread", "");
    Object.defineProperty(root.querySelectorAll("article")[1], "clientWidth", { value: 100 });
    const { result } = renderHook(() => useReaderPageMeasurement("Psa", 6));
    act(() => { vi.runOnlyPendingTimers(); });
    expect(result.current.pageBox).toEqual({ w: 530, h: 730 });
  });
});
