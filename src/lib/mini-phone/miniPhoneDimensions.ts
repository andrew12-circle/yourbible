/** iPhone Pro Max logical size (pt) — 14/15/16 Pro Max. */
export const IPHONE_PRO_MAX_WIDTH_PT = 430;
export const IPHONE_PRO_MAX_HEIGHT_PT = 932;

/** Layout reference width for mini phone home grid scaling. */
export const MINI_PHONE_LAYOUT_WIDTH = IPHONE_PRO_MAX_WIDTH_PT;

export const MINI_PHONE_ASPECT = IPHONE_PRO_MAX_HEIGHT_PT / IPHONE_PRO_MAX_WIDTH_PT;

/** Default open scale (~75% of Pro Max) — readable on desktop while matching phone proportions. */
export const MINI_PHONE_DEFAULT_SCALE = 0.75;

export const MINI_PHONE_MIN_WIDTH = 260;
export const MINI_PHONE_MAX_WIDTH = 520;
export const MINI_PHONE_MIN_HEIGHT = Math.round(MINI_PHONE_MIN_WIDTH * MINI_PHONE_ASPECT);

export function miniPhoneHeightForWidth(width: number): number {
  return Math.round(width * MINI_PHONE_ASPECT);
}

export function miniPhoneWidthForHeight(height: number): number {
  return Math.round(height / MINI_PHONE_ASPECT);
}

export const MINI_PHONE_DEFAULT_WIDTH = Math.round(IPHONE_PRO_MAX_WIDTH_PT * MINI_PHONE_DEFAULT_SCALE);
export const MINI_PHONE_DEFAULT_HEIGHT = miniPhoneHeightForWidth(MINI_PHONE_DEFAULT_WIDTH);

/** Fit Pro Max ratio inside viewport caps. */
export function fitMiniPhoneSize(
  width: number,
  opts?: { maxWidth?: number; maxHeight?: number; minWidth?: number; minHeight?: number },
): { w: number; h: number } {
  const maxW = opts?.maxWidth ?? MINI_PHONE_MAX_WIDTH;
  const maxH = opts?.maxHeight ?? (typeof window !== "undefined" ? window.innerHeight - 32 : 900);
  const minW = opts?.minWidth ?? MINI_PHONE_MIN_WIDTH;
  const minH = opts?.minHeight ?? MINI_PHONE_MIN_HEIGHT;

  let w = Math.min(maxW, Math.max(minW, width));
  let h = miniPhoneHeightForWidth(w);

  if (h > maxH) {
    h = Math.max(minH, maxH);
    w = Math.min(maxW, Math.max(minW, miniPhoneWidthForHeight(h)));
    h = miniPhoneHeightForWidth(w);
  }

  return { w, h };
}

export function defaultMiniPhoneSize(viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900): {
  w: number;
  h: number;
} {
  return fitMiniPhoneSize(MINI_PHONE_DEFAULT_WIDTH, { maxHeight: viewportHeight - 32 });
}
