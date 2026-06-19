import { measureTextareaCaretRect } from "@/lib/journal/textareaMirrorStyles";

/** Mirror-div caret offset from the top of the textarea content box. */
export function measureTextareaCaretTop(textarea: HTMLTextAreaElement): number {
  return measureTextareaCaretRect(textarea).top;
}

export type ScrollEditorCaretOptions = {
  scrollEl: HTMLElement;
  textarea: HTMLTextAreaElement;
  /** Occlusion from the bottom of the scroll pane (dock, keyboard, etc.). */
  bottomInsetPx?: number;
  /** Sticky chrome inside the scroll pane (header/toolbar). */
  topInsetPx?: number;
  /**
   * Where to place the caret within the visible writing band (0 = top, 1 = bottom).
   * ~0.45 keeps the cursor in the upper half while typing.
   */
  caretAnchorRatio?: number;
  minPaddingPx?: number;
};

export type CaretScrollGeometry = {
  scrollTop: number;
  /** Visible writing band — viewport client coordinates. */
  visibleTop: number;
  visibleBottom: number;
  caretTop: number;
  caretBottom: number;
  caretAnchorRatio?: number;
  minPaddingPx?: number;
};

/** Pure scroll delta for keeping the caret in the visible writing band. */
export function computeEditorCaretScrollDelta({
  scrollTop,
  visibleTop,
  visibleBottom,
  caretTop,
  caretBottom,
  caretAnchorRatio = 0.45,
  minPaddingPx = 20,
}: CaretScrollGeometry): number {
  const bandHeight = Math.max(0, visibleBottom - visibleTop);
  if (bandHeight <= 0) return scrollTop;

  const targetCaretY = visibleTop + bandHeight * caretAnchorRatio;
  const maxCaretBottom = visibleBottom - minPaddingPx;
  const lineHeight = Math.max(caretBottom - caretTop, 1);

  if (caretBottom > maxCaretBottom) {
    const delta = caretBottom - Math.min(targetCaretY + lineHeight, maxCaretBottom);
    return scrollTop + delta;
  }

  if (caretTop < visibleTop + minPaddingPx) {
    return scrollTop - (visibleTop + minPaddingPx - caretTop);
  }

  return scrollTop;
}

/**
 * Scrolls a journal editor pane so the textarea caret stays above bottom chrome.
 */
export function scrollEditorCaretIntoView({
  scrollEl,
  textarea,
  bottomInsetPx = 0,
  topInsetPx = 0,
  caretAnchorRatio = 0.45,
  minPaddingPx = 20,
}: ScrollEditorCaretOptions): void {
  const scrollRect = scrollEl.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  const caretTop = textareaRect.top + measureTextareaCaretTop(textarea) - textarea.scrollTop;
  const lineHeight =
    Number.parseFloat(getComputedStyle(textarea).lineHeight || "0") ||
    Number.parseFloat(getComputedStyle(textarea).fontSize || "16") * 1.4;
  const caretBottom = caretTop + lineHeight;

  scrollEl.scrollTop = computeEditorCaretScrollDelta({
    scrollTop: scrollEl.scrollTop,
    visibleTop: scrollRect.top + topInsetPx,
    visibleBottom: scrollRect.bottom - bottomInsetPx,
    caretTop,
    caretBottom,
    caretAnchorRatio,
    minPaddingPx,
  });
}
