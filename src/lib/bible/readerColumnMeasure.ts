import type { CSSProperties } from "react";

/** Gap between facing page text areas when measuring a four-column spread (~2× spine gutter). */
export const SPREAD_MEASURE_GAP_PX = 112;

export interface ScriptureColumnMeasureOptions {
  /** Override column count (e.g. 4 for an open-book spread). */
  columnCount?: number;
  /** Fixed width for the column wrapper during measurement. */
  measureWidthPx?: number;
}

/**
 * Pagination measurement helpers for CSS multi-column scripture layout.
 * Live pages must use the same fixed pixel height as the hidden paginator or
 * browsers fall back to balanced columns (top-half / bottom-half banding).
 */

/** Default slack reserved in paginator fit tests (must match ReaderPage). */
export const READER_COLUMN_FOOTER_GUARD_PX = 20;

/** Chapter title block reserved above the text area on non-opening pages. */
export const READER_CHAPTER_HEADER_RESERVE_PX = 96;

export interface ReaderColumnContentHeightOptions {
  columnLayoutActive: boolean;
  /** Opening spread page whose article was measured as the chapter-start surface. */
  measuresFirstPage: boolean;
  /** Slice begins with a chapter-header stream unit. */
  startsWithChapterHeader: boolean;
  firstPageHeight: number;
  pageHeight: number;
  footerGuardPx?: number;
  chapterHeaderReservePx?: number;
}

/**
 * Pixel height for live column wrappers — must match BookPaginator / Paginator
 * `pageContentLimit` or column-fill:auto leaves an empty second column.
 */
export function readerColumnContentHeightPx(
  options: ReaderColumnContentHeightOptions,
): number | undefined {
  if (!options.columnLayoutActive) return undefined;
  const footer = options.footerGuardPx ?? READER_COLUMN_FOOTER_GUARD_PX;
  const headerReserve =
    options.chapterHeaderReservePx ?? READER_CHAPTER_HEADER_RESERVE_PX;
  const { firstPageHeight, pageHeight } = options;

  if (options.measuresFirstPage && firstPageHeight > 0) {
    return Math.max(1, firstPageHeight - footer);
  }
  if (pageHeight <= 0) return undefined;
  if (options.startsWithChapterHeader) {
    return Math.max(1, pageHeight - headerReserve - footer);
  }
  return Math.max(1, pageHeight - footer);
}

/** Inline styles for the live `.scripture-columns-2` wrapper (matches paginator). */
export function scriptureColumnWrapperStyle(contentHeightPx?: number): CSSProperties {
  const base: CSSProperties = {
    overflow: "hidden",
    boxSizing: "border-box",
    columnFill: "auto",
    WebkitColumnFill: "auto",
    width: "100%",
  };
  if (!contentHeightPx || contentHeightPx <= 0) return base;
  const h = Math.max(1, Math.round(contentHeightPx));
  return { ...base, height: h, maxHeight: h };
}

export function applyScriptureColumnMeasureHtml(
  node: HTMLDivElement,
  bodyHtml: string,
  columnsClassName: string | undefined,
  contentHeightPx: number,
  options?: ScriptureColumnMeasureOptions,
): void {
  if (!columnsClassName) {
    node.innerHTML = bodyHtml;
    return;
  }
  const h = Math.max(1, Math.round(contentHeightPx));
  const columnCount = options?.columnCount ?? 2;
  const width =
    options?.measureWidthPx != null && options.measureWidthPx > 0
      ? `width:${Math.round(options.measureWidthPx)}px;`
      : "width:100%;";
  node.innerHTML =
    `<div class="${columnsClassName}" style="height:${h}px;overflow:hidden;${width}min-height:0;box-sizing:border-box;column-fill:auto;-webkit-column-fill:auto;columns:${columnCount}">` +
    `${bodyHtml}</div>`;
}

/**
 * True when rendered content fits within the page text area (incl. multi-column flow).
 * Detects clipped overflow columns via scrollWidth and natural column height.
 */
export function scriptureContentFitsPage(
  node: HTMLDivElement,
  contentHeightPx: number,
  columnsClassName?: string,
): boolean {
  const limit = Math.max(1, Math.round(contentHeightPx));
  if (!columnsClassName) {
    return node.scrollHeight <= limit;
  }
  const col = node.firstElementChild as HTMLElement | null;
  if (!col) return true;

  col.style.height = `${limit}px`;
  col.style.maxHeight = `${limit}px`;
  col.style.overflow = "hidden";

  // Extra implicit columns widen the scroll box beyond the declared column count.
  if (col.scrollWidth > col.clientWidth + 2) {
    return false;
  }
  // Clipped vertical overflow (common when column-fill:auto exhausts column height).
  if (col.scrollHeight > limit + 1) {
    return false;
  }

  col.style.height = "auto";
  col.style.maxHeight = "none";
  col.style.overflow = "visible";
  const naturalHeight = col.scrollHeight;

  return naturalHeight <= limit + 1;
}
