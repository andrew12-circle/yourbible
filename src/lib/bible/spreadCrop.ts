/** Fraction of the right page width kept visible when the spread is cropped. */
export const SPREAD_RIGHT_PEEK = 0.18;

/** Inner spread width as a multiple of the visible viewport (always ≥ 1). */
export function spreadCropWidthRatio(peek: number = SPREAD_RIGHT_PEEK): number {
  return 2 / (1 + peek);
}

/** CSS width for a left-aligned open book whose right cover flows off-screen. */
export function spreadCropWidthCss(
  peek: number = SPREAD_RIGHT_PEEK,
  hubEmbedded = false,
  leftInset = "0px",
): string {
  const ratio = spreadCropWidthRatio(peek);
  if (hubEmbedded) {
    return `calc(100% * ${ratio})`;
  }
  return `calc((100vw - (${leftInset})) * ${ratio} + (${leftInset}))`;
}

/** Left inset before the cover when the spread bleeds off the right edge. */
export function spreadCropLeftInsetCss(
  hubEmbedded: boolean,
  tabletPortrait: boolean,
): string {
  if (hubEmbedded || tabletPortrait) return "0px";
  return "max(0.5rem, env(safe-area-inset-left, 0px))";
}
