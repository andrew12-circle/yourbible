import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { scrollEditorCaretIntoView } from "@/lib/journal/scrollEditorCaretIntoView";

type Options = {
  scrollRef: RefObject<HTMLElement | null>;
  bottomDockRef?: RefObject<HTMLElement | null>;
  kbInset?: number;
  enabled: boolean;
  /** When set, skips measuring a fixed bottom dock (e.g. desktop editor pane). */
  fixedBottomInsetPx?: number;
  /** Sticky header/toolbar inside the scroll pane (desktop desk editor). */
  topInsetPx?: number;
};

function resolveActiveTextarea(scrollEl: HTMLElement | null): HTMLTextAreaElement | null {
  if (!scrollEl) return null;
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement && scrollEl.contains(active)) return active;
  return scrollEl.querySelector("textarea");
}

export function useJournalEditorCaretScroll({
  scrollRef,
  bottomDockRef,
  kbInset = 0,
  enabled,
  fixedBottomInsetPx,
  topInsetPx = 0,
}: Options) {
  const [bottomChromePx, setBottomChromePx] = useState(fixedBottomInsetPx ?? 152);
  const rafRef = useRef<number | null>(null);
  const userScrolledRef = useRef(false);
  const programmaticScrollRef = useRef(false);

  useLayoutEffect(() => {
    if (fixedBottomInsetPx != null) {
      setBottomChromePx(fixedBottomInsetPx);
      return;
    }
    const dock = bottomDockRef?.current;
    const scrollEl = scrollRef.current;
    if (!dock) return;

    const sync = () => {
      const h = Math.ceil(dock.getBoundingClientRect().height);
      setBottomChromePx(h);
      scrollEl?.style.setProperty("--journal-entry-dock-h", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(dock);
    return () => {
      ro.disconnect();
      scrollEl?.style.removeProperty("--journal-entry-dock-h");
    };
  }, [bottomDockRef, scrollRef, fixedBottomInsetPx]);

  const scrollCaretIntoView = useCallback(() => {
    const scrollEl = scrollRef.current;
    const textarea = resolveActiveTextarea(scrollEl);
    if (!scrollEl || !textarea || !enabled) return;
    if (userScrolledRef.current) return;

    programmaticScrollRef.current = true;
    scrollEditorCaretIntoView({
      scrollEl,
      textarea,
      bottomInsetPx: bottomChromePx + kbInset,
      topInsetPx,
    });
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, [scrollRef, bottomChromePx, kbInset, topInsetPx, enabled]);

  const scheduleScroll = useCallback(() => {
    if (userScrolledRef.current) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      scrollCaretIntoView();
    });
  }, [scrollCaretIntoView]);

  const resumeCaretFollow = useCallback(() => {
    userScrolledRef.current = false;
    scrollCaretIntoView();
  }, [scrollCaretIntoView]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !enabled) return;

    const onUserScroll = () => {
      if (programmaticScrollRef.current) return;
      userScrolledRef.current = true;
    };

    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement) resumeCaretFollow();
    };

    const onInput = (e: Event) => {
      if (e.target instanceof HTMLTextAreaElement) resumeCaretFollow();
    };

    const onClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLTextAreaElement) resumeCaretFollow();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) resumeCaretFollow();
    };

    const onSelectionChange = () => {
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement && scrollEl.contains(active)) {
        scheduleScroll();
      }
    };

    const onViewportChange = () => scheduleScroll();

    scrollEl.addEventListener("scroll", onUserScroll, { passive: true });
    scrollEl.addEventListener("wheel", onUserScroll, { passive: true });
    scrollEl.addEventListener("focusin", onFocusIn);
    scrollEl.addEventListener("input", onInput);
    scrollEl.addEventListener("click", onClick);
    scrollEl.addEventListener("keyup", onKeyUp);
    document.addEventListener("selectionchange", onSelectionChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);

    return () => {
      scrollEl.removeEventListener("scroll", onUserScroll);
      scrollEl.removeEventListener("wheel", onUserScroll);
      scrollEl.removeEventListener("focusin", onFocusIn);
      scrollEl.removeEventListener("input", onInput);
      scrollEl.removeEventListener("click", onClick);
      scrollEl.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, resumeCaretFollow, scheduleScroll, scrollRef]);

  useEffect(() => {
    if (!enabled) return;
    userScrolledRef.current = false;
    scheduleScroll();
  }, [enabled, kbInset, bottomChromePx, scheduleScroll]);

  return { scrollCaretIntoView: resumeCaretFollow };
}
