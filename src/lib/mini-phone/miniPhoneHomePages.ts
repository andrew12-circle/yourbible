export const MINI_PHONE_HOME_COLS = 4;

/** Split app indexes into launcher pages — no vertical scroll, swipe horizontally instead. */
export function splitMiniPhoneHomePages(
  appCount: number,
  gridHeightPx: number,
  rowStridePx: number,
): number[][] {
  if (appCount <= 0) return [[]];
  const safeStride = Math.max(1, rowStridePx);
  const rows = Math.max(1, Math.floor((gridHeightPx - 6) / safeStride));
  const perPage = rows * MINI_PHONE_HOME_COLS;
  const pages: number[][] = [];
  for (let i = 0; i < appCount; i += perPage) {
    pages.push(Array.from({ length: Math.min(perPage, appCount - i) }, (_, j) => i + j));
  }
  return pages;
}
