import { useEffect } from "react";

/**
 * Nested reader scroll areas sit inside overflow-hidden hub/book chrome.
 * Some browsers never deliver wheel deltas to those inner containers, so
 * forward wheel events manually when the pane can still scroll.
 */
export function useBibleScrollWheel(enabled: boolean, resetKey: string) {
  useEffect(() => {
    if (!enabled) return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      let el = target.closest<HTMLElement>("[data-bible-scroll]");
      if (!el && target.closest("[data-reader-ink-layer]")) {
        el = document.querySelector<HTMLElement>("[data-bible-scroll]");
      }
      if (!el) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;

      const next = el.scrollTop + event.deltaY;
      const goingDown = event.deltaY > 0;
      const goingUp = event.deltaY < 0;
      const canScrollDown = el.scrollTop < maxScroll - 1;
      const canScrollUp = el.scrollTop > 0;

      if ((goingDown && canScrollDown) || (goingUp && canScrollUp)) {
        event.preventDefault();
        el.scrollTop = Math.max(0, Math.min(maxScroll, next));
      }
    };

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, [enabled, resetKey]);
}
