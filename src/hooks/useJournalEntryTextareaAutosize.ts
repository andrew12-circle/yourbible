import { useLayoutEffect, type RefObject } from "react";

/** Grow a journal body textarea with its content; page scroll handles overflow. */
export function useJournalEntryTextareaAutosize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const minPx = Number.parseFloat(getComputedStyle(el).minHeight) || 0;
    el.style.height = `${Math.max(el.scrollHeight, minPx)}px`;
    el.style.overflowY = "hidden";
  }, [ref, value]);
}
