import { useLayoutEffect, type RefObject } from "react";

/** Grow a journal body textarea with its content; page scroll handles overflow. */
export function resizeJournalTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.overflow = "hidden";
  const minPx = Number.parseFloat(getComputedStyle(el).minHeight) || 0;
  el.style.height = `${Math.max(el.scrollHeight + 8, minPx)}px`;
  el.style.overflowY = "hidden";
  el.style.overflowX = "hidden";
}

export function useJournalEntryTextareaAutosize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  enabled = true,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.style.height = "";
      el.style.overflow = "";
      el.style.overflowY = "";
      el.style.overflowX = "";
      return;
    }
    resizeJournalTextarea(el);
  }, [ref, value, enabled]);
}
