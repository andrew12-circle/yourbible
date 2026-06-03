import { useEffect } from "react";

const VIEWPORT_LOCK =
  "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

/**
 * Prevents Safari/iPadOS page pinch-zoom while a full-screen ink surface is active.
 * Restores the previous viewport meta on cleanup.
 */
export function useLockPageZoom(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const meta = document.querySelector('meta[name="viewport"]');
    const previous = meta?.getAttribute("content") ?? "";
    meta?.setAttribute("content", VIEWPORT_LOCK);

    const blockGesture = (event: Event) => event.preventDefault();
    const blockCtrlWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };

    const opts = { passive: false } as AddEventListenerOptions;
    document.addEventListener("gesturestart", blockGesture, opts);
    document.addEventListener("gesturechange", blockGesture, opts);
    document.addEventListener("gestureend", blockGesture, opts);
    document.addEventListener("wheel", blockCtrlWheel, opts);

    return () => {
      meta?.setAttribute("content", previous);
      document.removeEventListener("gesturestart", blockGesture, opts);
      document.removeEventListener("gesturechange", blockGesture, opts);
      document.removeEventListener("gestureend", blockGesture, opts);
      document.removeEventListener("wheel", blockCtrlWheel, opts);
    };
  }, [active]);
}
