import { useLayoutEffect, type RefObject } from "react";

/** Grow a journal body textarea with its content; page scroll handles overflow. */
export function useJournalEntryTextareaAutosize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflow = "hidden";
    const minPx = Number.parseFloat(getComputedStyle(el).minHeight) || 0;
    el.style.height = `${Math.max(el.scrollHeight + 8, minPx)}px`;
    el.style.overflowY = "hidden";
    el.style.overflowX = "hidden";
  }, [ref, value]);
}
