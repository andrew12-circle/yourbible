import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { scrollEditorCaretIntoView } from "@/lib/journal/scrollEditorCaretIntoView";

type Options = {
  scrollRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  value: string;
  resetKey: string | null;
};

/** Desktop dock is a flex sibling, not an overlay. Its height is already excluded
 * from the scroll pane's rectangle; subtracting it again hides usable space. */
export function useJournalDeskWritingScroll(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const frame = useRef<number | null>(null);
  const reading = useRef(false);

  const cancel = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const followCaret = useCallback((resume = false) => {
    if (resume) reading.current = false;
    cancel();
    // Native input bubbles before React commits the new value and autosizes.
    // Measure after that layout, not against the previous textarea height.
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const { enabled, scrollRef } = latest.current;
      const pane = scrollRef.current;
      const field = document.activeElement;
      if (!enabled || reading.current || !pane || !(field instanceof HTMLTextAreaElement) || !pane.contains(field)) return;
      scrollEditorCaretIntoView({
        scrollEl: pane,
        textarea: field,
        bottomInsetPx: 0,
        topInsetPx: 8,
        caretAnchorRatio: 0.7,
        minPaddingPx: Math.min(96, Math.max(24, pane.clientHeight * 0.2)),
      });
    });
  }, [cancel]);

  useLayoutEffect(() => {
    const pane = options.scrollRef.current;
    if (!options.enabled || !pane) return;
    reading.current = false;
    const updateRoom = () => {
      // Real trailing padding lets the last line move up even at the end of a
      // document. scroll-padding alone cannot create additional scroll range.
      const room = Math.ceil(Math.min(240, Math.max(96, pane.clientHeight * 0.35)));
      pane.style.setProperty("--journal-writing-room", `${room}px`);
      followCaret();
    };
    const resume = (event: Event) => {
      if (event.target instanceof HTMLTextAreaElement) followCaret(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (/^(Arrow(Up|Down|Left|Right)|Home|End|PageUp|PageDown)$/.test(event.key)) resume(event);
    };
    const readEarlier = () => { reading.current = true; cancel(); };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target === pane) readEarlier(); // Scrollbar dragging.
    };
    updateRoom();
    const observer = new ResizeObserver(updateRoom);
    observer.observe(pane);
    pane.addEventListener("input", resume);
    pane.addEventListener("focusin", resume);
    pane.addEventListener("compositionend", resume);
    pane.addEventListener("keyup", onKeyUp);
    pane.addEventListener("wheel", readEarlier, { passive: true });
    pane.addEventListener("touchmove", readEarlier, { passive: true });
    pane.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancel();
      observer.disconnect();
      pane.style.removeProperty("--journal-writing-room");
      pane.removeEventListener("input", resume);
      pane.removeEventListener("focusin", resume);
      pane.removeEventListener("compositionend", resume);
      pane.removeEventListener("keyup", onKeyUp);
      pane.removeEventListener("wheel", readEarlier);
      pane.removeEventListener("touchmove", readEarlier);
      pane.removeEventListener("pointerdown", onPointerDown);
    };
  }, [options.enabled, options.resetKey, options.scrollRef, cancel, followCaret]);

  // Covers dictation/AI edits too, but never steals scroll while reading earlier
  // text or while the title/toolbar/map has focus. Autosave revisions are absent.
  useLayoutEffect(() => {
    if (options.enabled) followCaret();
  }, [options.value, options.enabled, followCaret]);

  const scrollToCaretEnd = useCallback(() => followCaret(true), [followCaret]);
  return { scrollToCaretEnd };
}
