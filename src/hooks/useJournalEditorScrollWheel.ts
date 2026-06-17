import { useEffect, type RefObject } from "react";

/**
 * Autosized journal textareas use overflow:hidden and swallow wheel events.
 * Forward wheel deltas to the editor scroll pane so users can read earlier text.
 */
export function useJournalEditorScrollWheel(
  scrollRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !enabled) return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !scrollEl.contains(target)) return;
      if (target === scrollEl) return;

      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
      if (maxScroll <= 0) return;

      const textarea = target.closest("textarea");
      if (textarea instanceof HTMLTextAreaElement) {
        const overflowY = getComputedStyle(textarea).overflowY;
        const scrollsInternally =
          (overflowY === "auto" || overflowY === "scroll") &&
          textarea.scrollHeight > textarea.clientHeight + 1;
        if (scrollsInternally) {
          const goingUp = event.deltaY < 0;
          const goingDown = event.deltaY > 0;
          if (goingUp && textarea.scrollTop > 0) return;
          if (goingDown && textarea.scrollTop < textarea.scrollHeight - textarea.clientHeight - 1) {
            return;
          }
        }
      }

      const next = scrollEl.scrollTop + event.deltaY;
      const goingDown = event.deltaY > 0;
      const goingUp = event.deltaY < 0;
      const canScrollDown = scrollEl.scrollTop < maxScroll - 1;
      const canScrollUp = scrollEl.scrollTop > 0;

      if ((goingDown && canScrollDown) || (goingUp && canScrollUp)) {
        event.preventDefault();
        scrollEl.scrollTop = Math.max(0, Math.min(maxScroll, next));
      }
    };

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, [enabled, scrollRef]);
}
