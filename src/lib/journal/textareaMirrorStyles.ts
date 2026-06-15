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
] as const;

export function applyTextareaMirrorStyles(source: HTMLElement, target: HTMLElement): void {
  const cs = getComputedStyle(source);
  for (const prop of TEXTAREA_MIRROR_STYLE_PROPS) {
    target.style[prop] = cs[prop];
  }
}
