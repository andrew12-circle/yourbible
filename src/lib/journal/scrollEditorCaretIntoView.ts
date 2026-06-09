const MIRROR_STYLE_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "wordSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "boxSizing",
] as const;

/** Mirror-div caret offset from the top of the textarea content box. */
export function measureTextareaCaretTop(textarea: HTMLTextAreaElement): number {
  const pos = textarea.selectionStart ?? textarea.value.length;
  const cs = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  for (const prop of MIRROR_STYLE_PROPS) {
    mirror.style[prop] = cs[prop];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.textContent = textarea.value.slice(0, pos);
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(pos) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top =
    marker.offsetTop +
    Number.parseFloat(cs.paddingTop || "0") +
    Number.parseFloat(cs.borderTopWidth || "0");
  document.body.removeChild(mirror);
  return top;
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
