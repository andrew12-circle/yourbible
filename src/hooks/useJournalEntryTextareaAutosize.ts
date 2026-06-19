import { useLayoutEffect, type RefObject } from "react";

/** Grow a journal body textarea with its content; page scroll handles overflow. */
export function resizeJournalTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.overflow = "hidden";
  const hasContent = el.value.length > 0;
  if (hasContent) {
    el.style.minHeight = "0px";
  } else {
    el.style.minHeight = "";
  }
  // Once the user has typed, shrink to content — never keep a tall empty tap target.
  const floorMinPx = hasContent ? 0 : Number.parseFloat(getComputedStyle(el).minHeight) || 0;
  el.style.height = `${Math.max(el.scrollHeight + 8, floorMinPx)}px`;
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
