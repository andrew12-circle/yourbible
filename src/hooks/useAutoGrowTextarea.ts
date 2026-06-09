import { useCallback, useEffect, type RefObject } from "react";

/** Matches ClaimResearchComposer: text-[11px] leading-snug py-1.5 */
export const TEXTAREA_LINE_HEIGHT_PX = 14;
const TEXTAREA_VERTICAL_PADDING_PX = 12;

export function textareaHeightForLines(lines: number): number {
  return Math.ceil(TEXTAREA_LINE_HEIGHT_PX * lines + TEXTAREA_VERTICAL_PADDING_PX);
}

type Options = {
  maxLines?: number;
  minLines?: number;
};

/**
 * Auto-grow textarea like Gemini: expands with content until maxLines, then scrolls.
 */
export function useAutoGrowTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  { maxLines = 7, minLines = 1 }: Options = {},
) {
  const maxPx = textareaHeightForLines(maxLines);
  const minPx = textareaHeightForLines(minLines);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const scroll = el.scrollHeight;
    const next = Math.min(Math.max(scroll, minPx), maxPx);
    el.style.height = `${next}px`;
    el.style.overflowY = scroll > maxPx ? "auto" : "hidden";
  }, [ref, maxPx, minPx]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return { resize, maxPx, minPx };
}
