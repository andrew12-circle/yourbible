import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EXPAND_AT_SCROLL_TOP_PX,
  useArtifactDesktopStickyVideoCompact,
} from "./useArtifactDesktopStickyVideoCompact";

describe("useArtifactDesktopStickyVideoCompact", () => {
  it("compacts once the full player scrolls above the study pane", () => {
    let observerCallback: IntersectionObserverCallback | null = null;

    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    const scrollRoot = document.createElement("div");
    const video = document.createElement("section");
    scrollRoot.appendChild(video);

    const scrollRef = { current: scrollRoot };
    const videoRef = { current: video };

    const { result } = renderHook(() =>
      useArtifactDesktopStickyVideoCompact(scrollRef, videoRef, true),
    );

    expect(result.current).toBe(false);
    expect(observerCallback).not.toBeNull();

    act(() => {
      observerCallback!(
        [
          {
            isIntersecting: false,
            boundingClientRect: { bottom: 0 } as DOMRectReadOnly,
            rootBounds: { top: 12 } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(result.current).toBe(true);

    vi.unstubAllGlobals();
  });

  it("expands again when scrolled back to the top", async () => {
    let observerCallback: IntersectionObserverCallback | null = null;

    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    const scrollRoot = document.createElement("div");
    Object.defineProperty(scrollRoot, "scrollTop", { value: 400, writable: true });
    const video = document.createElement("section");
    scrollRoot.appendChild(video);

    const scrollRef = { current: scrollRoot };
    const videoRef = { current: video };

    const { result } = renderHook(() =>
      useArtifactDesktopStickyVideoCompact(scrollRef, videoRef, true),
    );

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      observerCallback?.(
        [
          {
            isIntersecting: false,
            boundingClientRect: { bottom: 0 } as DOMRectReadOnly,
            rootBounds: { top: 12 } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    expect(result.current).toBe(true);

    await act(async () => {
      scrollRoot.scrollTop = EXPAND_AT_SCROLL_TOP_PX;
      scrollRoot.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(false);

    vi.unstubAllGlobals();
  });

  it("returns false when disabled", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const videoRef = { current: null as HTMLDivElement | null };

    const { result } = renderHook(() =>
      useArtifactDesktopStickyVideoCompact(scrollRef, videoRef, false),
    );

    expect(result.current).toBe(false);
  });
});
