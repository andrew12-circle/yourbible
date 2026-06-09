export const MINI_PHONE_HOME_COLS = 4;

/** Estimated row height (icon + label + gap) for the mini phone launcher grid. */
export function miniPhoneRowStride(compact: boolean): number {
  return compact ? 62 : 74;
}

/** Split app indexes into launcher pages — no vertical scroll, swipe horizontally instead. */
export function splitMiniPhoneHomePages(
  appCount: number,
  gridHeightPx: number,
  compact: boolean,
): number[][] {
  if (appCount <= 0) return [[]];
  const rowStride = miniPhoneRowStride(compact);
  const rows = Math.max(1, Math.floor(gridHeightPx / rowStride));
  const perPage = rows * MINI_PHONE_HOME_COLS;
  const pages: number[][] = [];
  for (let i = 0; i < appCount; i += perPage) {
    pages.push(Array.from({ length: Math.min(perPage, appCount - i) }, (_, j) => i + j));
  }
  return pages;
}
