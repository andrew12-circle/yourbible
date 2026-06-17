import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { scrollEditorCaretIntoView } from "@/lib/journal/scrollEditorCaretIntoView";

type Options = {
  scrollRef: RefObject<HTMLElement | null>;
  bottomDockRef?: RefObject<HTMLElement | null>;
  kbInset?: number;
  enabled: boolean;
  /** When this changes (e.g. new entry), scroll to the writing end once. */
  resetKey?: string | number | null;
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

function forwardWheelToScrollPane(scrollEl: HTMLElement, event: WheelEvent) {
  const target = event.target;
  if (!(target instanceof Element) || !scrollEl.contains(target)) return false;
  if (target === scrollEl) return false;

  const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
  if (maxScroll <= 0) return false;

  const textarea = target.closest("textarea");
  if (textarea instanceof HTMLTextAreaElement) {
    const overflowY = getComputedStyle(textarea).overflowY;
    const scrollsInternally =
      (overflowY === "auto" || overflowY === "scroll") &&
      textarea.scrollHeight > textarea.clientHeight + 1;
    if (scrollsInternally) {
      const goingUp = event.deltaY < 0;
      const goingDown = event.deltaY > 0;
      if (goingUp && textarea.scrollTop > 0) return false;
      if (goingDown && textarea.scrollTop < textarea.scrollHeight - textarea.clientHeight - 1) {
        return false;
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
    return true;
  }
  return false;
}

export function useJournalEditorCaretScroll({
  scrollRef,
  bottomDockRef,
  kbInset = 0,
  enabled,
  resetKey = null,
  fixedBottomInsetPx,
  topInsetPx = 0,
}: Options) {
  const [bottomChromePx, setBottomChromePx] = useState(fixedBottomInsetPx ?? 152);
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

  const applyCaretScroll = useCallback(
    (force = false) => {
      const scrollEl = scrollRef.current;
      const textarea = resolveActiveTextarea(scrollEl);
      if (!scrollEl || !textarea || !enabled) return;
      if (!force && userScrolledRef.current) return;

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
    },
    [scrollRef, bottomChromePx, kbInset, topInsetPx, enabled],
  );

  const markUserScrolled = useCallback(() => {
    if (!programmaticScrollRef.current) userScrolledRef.current = true;
  }, []);

  const scrollToCaretEnd = useCallback(() => {
    userScrolledRef.current = false;
    applyCaretScroll(true);
  }, [applyCaretScroll]);

  const applyCaretScrollRef = useRef(applyCaretScroll);
  applyCaretScrollRef.current = applyCaretScroll;
  const lastResetKeyRef = useRef<string | number | null | undefined>(undefined);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !enabled) return;

    const onUserScroll = () => markUserScrolled();

    const onWheel = (event: WheelEvent) => {
      if (!scrollEl.contains(event.target instanceof Element ? event.target : null)) return;
      if (forwardWheelToScrollPane(scrollEl, event)) {
        markUserScrolled();
      } else if (event.target === scrollEl) {
        markUserScrolled();
      }
    };

    const onInput = (e: Event) => {
      if (!(e.target instanceof HTMLTextAreaElement)) return;
      userScrolledRef.current = false;
      applyCaretScrollRef.current(false);
    };

    scrollEl.addEventListener("scroll", onUserScroll, { passive: true });
    scrollEl.addEventListener("touchmove", onUserScroll, { passive: true });
    scrollEl.addEventListener("input", onInput);
    document.addEventListener("wheel", onWheel, { passive: false, capture: true });

    return () => {
      scrollEl.removeEventListener("scroll", onUserScroll);
      scrollEl.removeEventListener("touchmove", onUserScroll);
      scrollEl.removeEventListener("input", onInput);
      document.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [enabled, markUserScrolled, scrollRef]);

  useEffect(() => {
    if (!enabled) return;
    if (lastResetKeyRef.current === resetKey) return;
    lastResetKeyRef.current = resetKey;
    userScrolledRef.current = false;
    requestAnimationFrame(() => applyCaretScrollRef.current(true));
  }, [enabled, resetKey]);

  return { scrollToCaretEnd };
}
