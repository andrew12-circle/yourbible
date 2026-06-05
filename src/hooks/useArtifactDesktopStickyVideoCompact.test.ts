import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useArtifactDesktopStickyVideoCompact } from "./useArtifactDesktopStickyVideoCompact";

describe("useArtifactDesktopStickyVideoCompact", () => {
  it("starts expanded and compacts when the sentinel leaves the scroll root", () => {
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
    const sentinel = document.createElement("div");
    scrollRoot.appendChild(sentinel);

    const scrollRef = { current: scrollRoot };
    const sentinelRef = { current: sentinel };

    const { result } = renderHook(() =>
      useArtifactDesktopStickyVideoCompact(scrollRef, sentinelRef, true),
    );

    expect(result.current).toBe(false);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(result.current).toBe(true);

    act(() => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(result.current).toBe(false);

    vi.unstubAllGlobals();
  });

  it("returns false when disabled", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const sentinelRef = { current: null as HTMLDivElement | null };

    const { result } = renderHook(() =>
      useArtifactDesktopStickyVideoCompact(scrollRef, sentinelRef, false),
    );

    expect(result.current).toBe(false);
  });
});
