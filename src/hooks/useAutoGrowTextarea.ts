import { useCallback, useEffect, type RefObject } from "react";

/** Matches ClaimResearchComposer: text-[11px] leading-snug py-1.5 */
export const TEXTAREA_LINE_HEIGHT_PX = 14;
const TEXTAREA_VERTICAL_PADDING_PX = 12;

/** Matches journal inline chat: text-[13px] leading-relaxed py-2 */
export const JOURNAL_CHAT_TEXTAREA_LINE_HEIGHT_PX = 21;
export const JOURNAL_CHAT_TEXTAREA_VERTICAL_PADDING_PX = 16;

export type TextareaHeightOptions = {
  lineHeightPx?: number;
  verticalPaddingPx?: number;
};

export function textareaHeightForLines(
  lines: number,
  { lineHeightPx = TEXTAREA_LINE_HEIGHT_PX, verticalPaddingPx = TEXTAREA_VERTICAL_PADDING_PX }: TextareaHeightOptions = {},
): number {
  return Math.ceil(lineHeightPx * lines + verticalPaddingPx);
}

type Options = TextareaHeightOptions & {
  maxLines?: number;
  minLines?: number;
};

/**
 * Auto-grow textarea like Gemini: expands with content until maxLines, then scrolls.
 */
export function useAutoGrowTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  {
    maxLines = 7,
    minLines = 1,
    lineHeightPx = TEXTAREA_LINE_HEIGHT_PX,
    verticalPaddingPx = TEXTAREA_VERTICAL_PADDING_PX,
  }: Options = {},
) {
  const heightOpts = { lineHeightPx, verticalPaddingPx };
  const maxPx = textareaHeightForLines(maxLines, heightOpts);
  const minPx = textareaHeightForLines(minLines, heightOpts);

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
