import { useLayoutEffect, useRef, type RefObject } from "react";

/** Follow speech inside the writing pane without focusing a field, opening a
 * phone keyboard, or scrolling the whole app. Reading/editing elsewhere pauses it. */
export function useJournalCaptionFollow(ref: RefObject<HTMLElement | null>, text: string) {
  const paused = useRef(false);
  const frame = useRef(0);
  useLayoutEffect(() => {
    const pane = ref.current?.closest<HTMLElement>("[data-journal-editor-scroll], [data-journal-compose-scroll]");
    if (!pane) return;
    const onWheel = (event: WheelEvent) => { if (event.deltaY < 0) paused.current = true; };
    const pause = () => { paused.current = true; };
    const onScroll = () => {
      if (pane.scrollHeight - pane.clientHeight - pane.scrollTop < 32) paused.current = false;
    };
    pane.addEventListener("wheel", onWheel, { passive: true });
    pane.addEventListener("touchmove", pause, { passive: true });
    pane.addEventListener("input", pause);
    pane.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      pane.removeEventListener("wheel", onWheel);
      pane.removeEventListener("touchmove", pause);
      pane.removeEventListener("input", pause);
      pane.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [ref]);
  useLayoutEffect(() => {
    cancelAnimationFrame(frame.current);
    if (!text) return;
    frame.current = requestAnimationFrame(() => {
      // Autosizing sibling textareas must finish before measuring the spoken line.
      frame.current = requestAnimationFrame(() => {
        const end = ref.current;
        const pane = end?.closest<HTMLElement>("[data-journal-editor-scroll], [data-journal-compose-scroll]");
        if (!end || !pane || paused.current) return;
        const bounds = pane.getBoundingClientRect();
        const vv = window.visualViewport;
        const dock = pane.closest("[data-journal-entry-page]")?.querySelector<HTMLElement>("[data-journal-compose-dock]");
        const dockTop = dock && dock.getBoundingClientRect().height > 0 ? dock.getBoundingClientRect().top : Infinity;
        const visibleBottom = Math.min(bounds.bottom, dockTop, vv ? vv.offsetTop + vv.height : window.innerHeight);
        const room = Math.min(80, Math.max(24, bounds.height * 0.18));
        const delta = end.getBoundingClientRect().bottom - (visibleBottom - room);
        if (delta > 0) pane.scrollTop += delta;
      });
    });
    return () => cancelAnimationFrame(frame.current);
  }, [ref, text]);
}
