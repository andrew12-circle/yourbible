/** Computed properties copied from a textarea/input to a mirror overlay for pixel alignment. */
export const TEXTAREA_MIRROR_STYLE_PROPS = [
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
  "textAlign",
  "wordBreak",
  "overflowWrap",
] as const;

export function applyTextareaMirrorStyles(source: HTMLElement, target: HTMLElement): void {
  const cs = getComputedStyle(source);
  for (const prop of TEXTAREA_MIRROR_STYLE_PROPS) {
    target.style[prop] = cs[prop];
  }
}

/** Match mirror box to the field's layout box (siblings under a `relative` wrapper). */
export function applyTextareaMirrorGeometry(source: HTMLElement, target: HTMLElement): void {
  target.style.top = `${source.offsetTop}px`;
  target.style.left = `${source.offsetLeft}px`;
  target.style.width = `${source.offsetWidth}px`;
  target.style.height = `${source.offsetHeight}px`;
}

export function syncTextareaMirrorLayout(source: HTMLElement, target: HTMLElement): void {
  applyTextareaMirrorStyles(source, target);
  applyTextareaMirrorGeometry(source, target);
}

export type TextFieldCaretRect = {
  top: number;
  left: number;
  height: number;
};

function readLineHeight(cs: CSSStyleDeclaration): number {
  const lh = Number.parseFloat(cs.lineHeight || "0");
  if (lh > 0 && Number.isFinite(lh)) return lh;
  const fs = Number.parseFloat(cs.fontSize || "16");
  return fs * 1.4;
}

/** Pixel caret position inside a textarea's content box (padding included). */
export function measureTextareaCaretRect(textarea: HTMLTextAreaElement): TextFieldCaretRect {
  const pos = textarea.selectionStart ?? textarea.value.length;
  const cs = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  applyTextareaMirrorStyles(textarea, mirror);
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.textContent = textarea.value.slice(0, pos);
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(pos, pos + 1) || "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const rect: TextFieldCaretRect = {
    top:
      marker.offsetTop +
      Number.parseFloat(cs.paddingTop || "0") +
      Number.parseFloat(cs.borderTopWidth || "0"),
    left:
      marker.offsetLeft +
      Number.parseFloat(cs.paddingLeft || "0") +
      Number.parseFloat(cs.borderLeftWidth || "0"),
    height: readLineHeight(cs),
  };
  document.body.removeChild(mirror);
  return rect;
}

/** Pixel caret position inside a single-line input's content box. */
export function measureInputCaretRect(input: HTMLInputElement): TextFieldCaretRect {
  const pos = input.selectionStart ?? input.value.length;
  const cs = getComputedStyle(input);
  const mirror = document.createElement("div");
  applyTextareaMirrorStyles(input, mirror);
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${input.clientWidth}px`;
  mirror.textContent = input.value.slice(0, pos);
  const marker = document.createElement("span");
  marker.textContent = input.value.slice(pos, pos + 1) || "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const rect: TextFieldCaretRect = {
    top:
      marker.offsetTop +
      Number.parseFloat(cs.paddingTop || "0") +
      Number.parseFloat(cs.borderTopWidth || "0"),
    left:
      marker.offsetLeft +
      Number.parseFloat(cs.paddingLeft || "0") +
      Number.parseFloat(cs.borderLeftWidth || "0"),
    height: readLineHeight(cs),
  };
  document.body.removeChild(mirror);
  return rect;
}

export function measureFieldCaretRect(
  field: HTMLTextAreaElement | HTMLInputElement,
): TextFieldCaretRect {
  return field instanceof HTMLTextAreaElement
    ? measureTextareaCaretRect(field)
    : measureInputCaretRect(field);
}
