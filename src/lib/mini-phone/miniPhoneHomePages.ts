import { miniPhoneRowStride } from "@/lib/mini-phone/miniPhoneIosLayout";

export const MINI_PHONE_HOME_COLS = 4;

/** Split app indexes into launcher pages — no vertical scroll, swipe horizontally instead. */
export function splitMiniPhoneHomePages(
  appCount: number,
  gridHeightPx: number,
  phoneWidth: number,
): number[][] {
  if (appCount <= 0) return [[]];
  const rowStride = miniPhoneRowStride(phoneWidth);
  const rows = Math.max(1, Math.floor(gridHeightPx / rowStride));
  const perPage = rows * MINI_PHONE_HOME_COLS;
  const pages: number[][] = [];
  for (let i = 0; i < appCount; i += perPage) {
    pages.push(Array.from({ length: Math.min(perPage, appCount - i) }, (_, j) => i + j));
  }
  return pages;
}
