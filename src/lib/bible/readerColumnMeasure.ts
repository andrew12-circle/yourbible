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

/** Extra slack on live column wrappers so the last line is never clipped vs paginator. */
export const READER_LIVE_COLUMN_SAFETY_PX = 32;

/** Horizontal inset applied to column boxes (must match CSS padding-inline on columns). */
export const READER_COLUMN_EDGE_INSET_EM = 0.35;

/** Paginator measure height — must stay in sync with live `liveColumnSafetyPx`. */
export function paginatorMeasureLimitPx(contentHeightPx: number): number {
  return Math.max(1, Math.round(contentHeightPx - READER_LIVE_COLUMN_SAFETY_PX));
}

/** Extra slack reserved per spread pane during paginator measurement. */
export const READER_SPREAD_PANE_EXTRA_GUARD_PX = 72;

/** Paginator stack height for one spread pane — tighter than live to avoid clip gaps. */
export function paginatorSpreadPaneLimitPx(stackLimitPx: number): number {
  return Math.max(1, Math.round(stackLimitPx - READER_SPREAD_PANE_EXTRA_GUARD_PX));
}

/** Pixel height for scripture column boxes — shared by paginator and live reader. */
export function readerScriptureColumnsHeightPx(
  stackContentHeightPx: number,
  holmanChromeBelowColumnsPx = 0,
): number {
  return Math.max(
    1,
    Math.round(stackContentHeightPx - holmanChromeBelowColumnsPx - READER_LIVE_COLUMN_SAFETY_PX),
  );
}

/** Clip slack for the last line / descenders inside a column box. */
export const READER_COLUMN_CLIP_GUARD_PX = 36;

/** Breathing room between the last scripture line and the page nav bar. */
export const READER_PAGE_NAV_CLEARANCE_PX = 40;

/** ReaderPageFooter height (h-10) + top border — reserved when layout may measure before footer mounts. */
export const READER_PAGE_NAV_FOOTER_PX = 48;

/** Default bottom guard for paginator fit tests + live column limits (must match ReaderPage). */
export const READER_COLUMN_FOOTER_GUARD_PX =
  READER_COLUMN_CLIP_GUARD_PX + READER_PAGE_NAV_CLEARANCE_PX;

/** Chapter title block reserved above the text area on non-opening pages. */
export const READER_CHAPTER_HEADER_RESERVE_PX = 96;

/** Conservative reserve for page footnotes band below scripture columns. */
export const READER_HOLMAN_FOOTNOTES_BAND_PX = 88;

/** Conservative reserve for cross-reference connections row (when shown). */
export const READER_HOLMAN_CONNECTIONS_BAND_PX = 48;

export interface ReaderPageContentLimitOptions {
  pageIndex: number;
  startsWithChapterHeader: boolean;
  firstPageHeight: number;
  pageHeight: number;
  footerGuardPx?: number;
  chapterHeaderReservePx?: number;
}

/** Shared paginator + live-page text-area height (px). */
export function readerPageContentLimitPx(
  options: ReaderPageContentLimitOptions,
): number {
  const footer = options.footerGuardPx ?? READER_COLUMN_FOOTER_GUARD_PX;
  const headerReserve =
    options.chapterHeaderReservePx ?? READER_CHAPTER_HEADER_RESERVE_PX;
  const { firstPageHeight, pageHeight, pageIndex, startsWithChapterHeader } = options;

  if (pageIndex === 0 && startsWithChapterHeader && firstPageHeight > 0) {
    return Math.max(1, firstPageHeight - footer);
  }
  if (startsWithChapterHeader) {
    return Math.max(1, pageHeight - headerReserve - footer);
  }
  return Math.max(1, pageHeight - footer);
}

/** Alias — spread pages use the same limit formula as single-page mode. */
export const readerSpreadPageContentLimitPx = readerPageContentLimitPx;

/** Pixel height for scripture columns inside a Holman stack (below connections/footnotes). */
export function scriptureColumnAreaHeightPx(
  stackContentHeightPx: number,
  chromeBelowColumnsPx: number,
): number {
  return Math.max(1, Math.round(stackContentHeightPx - chromeBelowColumnsPx));
}

export function holmanChromeBelowColumnsPx(options: {
  hasFootnotes: boolean;
  hasConnections: boolean;
}): number {
  let reserve = 0;
  if (options.hasFootnotes) reserve += READER_HOLMAN_FOOTNOTES_BAND_PX;
  if (options.hasConnections) reserve += READER_HOLMAN_CONNECTIONS_BAND_PX;
  return reserve;
}

export interface ReaderColumnContentHeightOptions {
  columnLayoutActive: boolean;
  /** Stream page index — must match BookPaginator pageIndex. */
  pageIndex: number;
  /** Slice begins with a chapter-header stream unit. */
  startsWithChapterHeader: boolean;
  firstPageHeight: number;
  pageHeight: number;
  footerGuardPx?: number;
  chapterHeaderReservePx?: number;
  /** Holman study stack: reserve space below columns for footnotes/connections. */
  holmanChromeBelowColumnsPx?: number;
  /** Live reader only — extra clip guard (paginator does not use this). */
  liveColumnSafetyPx?: number;
}

/**
 * Pixel height for live column wrappers — must match BookPaginator / Paginator
 * `pageContentLimit` or column-fill:auto leaves an empty second column.
 */
export function readerColumnContentHeightPx(
  options: ReaderColumnContentHeightOptions,
): number | undefined {
  if (!options.columnLayoutActive) return undefined;
  if (options.pageHeight <= 0) return undefined;
  const stackLimit = readerPageContentLimitPx({
    pageIndex: options.pageIndex,
    startsWithChapterHeader: options.startsWithChapterHeader,
    firstPageHeight: options.firstPageHeight,
    pageHeight: options.pageHeight,
    footerGuardPx: options.footerGuardPx,
    chapterHeaderReservePx: options.chapterHeaderReservePx,
  });
  const chrome = options.holmanChromeBelowColumnsPx ?? 0;
  const liveSafety = options.liveColumnSafetyPx ?? 0;
  if (chrome > 0 || liveSafety > 0) {
    return readerScriptureColumnsHeightPx(stackLimit, chrome);
  }
  return readerScriptureColumnsHeightPx(stackLimit);
}

export interface ReaderPageHeightsOptions {
  pageContentReady: boolean;
  hasStreamSlice: boolean;
  scrollMode: boolean;
  columnLayoutActive: boolean;
  pageIndex: number;
  startsWithChapterHeader: boolean;
  firstPageHeight: number;
  pageHeight: number;
  footerGuardPx?: number;
  chapterHeaderReservePx?: number;
  reserveFootnotesBand: boolean;
  liveColumnSafetyPx?: number;
  /** Match paginator spread pane limits so live columns never exceed measure height. */
  spreadPane?: boolean;
}

/** Live stack + column heights for one rendered reader page (undefined when not measurable). */
export function readerPageHeightsPx(options: ReaderPageHeightsOptions): {
  stackContentHeightPx: number | undefined;
  scriptureColumnHeightPx: number | undefined;
} {
  const canMeasure =
    !options.scrollMode && (options.pageContentReady || options.hasStreamSlice);
  const rawStackLimit = canMeasure
    ? readerPageContentLimitPx({
        pageIndex: options.pageIndex,
        startsWithChapterHeader: options.startsWithChapterHeader,
        firstPageHeight: options.firstPageHeight,
        pageHeight: options.pageHeight,
        footerGuardPx: options.footerGuardPx,
        chapterHeaderReservePx: options.chapterHeaderReservePx,
      })
    : undefined;
  const stackContentHeightPx =
    rawStackLimit != null && options.spreadPane
      ? paginatorSpreadPaneLimitPx(rawStackLimit)
      : rawStackLimit;
  const scriptureColumnHeightPx =
    stackContentHeightPx != null && options.columnLayoutActive
      ? readerScriptureColumnsHeightPx(
          stackContentHeightPx,
          options.reserveFootnotesBand
            ? holmanChromeBelowColumnsPx({ hasFootnotes: true, hasConnections: false })
            : 0,
        )
      : undefined;
  return { stackContentHeightPx, scriptureColumnHeightPx };
}

/** Stack height for Holman pages (columns + footnotes band). */
export function readerHolmanStackContentHeightPx(
  options: ReaderColumnContentHeightOptions & {
    hasFootnotes: boolean;
    hasConnections: boolean;
  },
): number | undefined {
  if (!options.columnLayoutActive || options.pageHeight <= 0) return undefined;
  return readerPageContentLimitPx({
    pageIndex: options.pageIndex,
    startsWithChapterHeader: options.startsWithChapterHeader,
    firstPageHeight: options.firstPageHeight,
    pageHeight: options.pageHeight,
    footerGuardPx: options.footerGuardPx,
    chapterHeaderReservePx: options.chapterHeaderReservePx,
  });
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

function studyStackScriptureColumnsEl(stack: HTMLElement): HTMLElement | null {
  return stack.querySelector('[class*="scripture-columns"]') as HTMLElement | null;
}

function studyStackFootnotesEl(stack: HTMLElement): HTMLElement | null {
  return stack.querySelector(".scripture-page-footnotes") as HTMLElement | null;
}

export function applyHolmanStudyMeasureHtml(
  node: HTMLDivElement,
  scriptureHtml: string,
  connectionsHtml: string,
  footnotesHtml: string,
  columnsClassName: string | undefined,
  contentHeightPx: number,
  options?: ScriptureColumnMeasureOptions,
): void {
  const h = Math.max(1, Math.round(contentHeightPx));
  const chromeBelow = (connectionsHtml ? READER_HOLMAN_CONNECTIONS_BAND_PX : 0)
    + (footnotesHtml ? READER_HOLMAN_FOOTNOTES_BAND_PX : 0);
  const columnH = readerScriptureColumnsHeightPx(h, chromeBelow);
  const columnCount = options?.columnCount ?? 2;
  const width =
    options?.measureWidthPx != null && options.measureWidthPx > 0
      ? `width:${Math.round(options.measureWidthPx)}px;`
      : "width:100%;";
  const columnsInner = columnsClassName
    ? `<div class="${columnsClassName}" style="height:100%;max-height:100%;overflow:hidden;${width}min-height:0;box-sizing:border-box;column-fill:auto;-webkit-column-fill:auto;columns:${columnCount}">${scriptureHtml}</div>`
    : scriptureHtml;
  const scriptureSectionStyle =
    `height:${columnH}px;max-height:${columnH}px;flex:0 0 auto;overflow:hidden;display:flex;flex-direction:column;min-height:0;min-width:0`;
  const scriptureSection = `<div style="${scriptureSectionStyle}">${columnsInner}</div>`;
  if (!connectionsHtml && !footnotesHtml) {
    node.innerHTML =
      `<div class="scripture-page-stack holman-study-stack reader-holman-study" style="height:${h}px;max-height:${h}px;overflow:hidden;display:flex;flex-direction:column;${width}min-height:0;box-sizing:border-box">` +
      scriptureSection +
      `</div>`;
    return;
  }
  const columnsInnerLegacy = columnsClassName
    ? `<div class="${columnsClassName}" style="height:${columnH}px;max-height:${columnH}px;overflow:hidden;${width}min-height:0;box-sizing:border-box;column-fill:auto;-webkit-column-fill:auto;columns:${columnCount}">${scriptureHtml}</div>`
    : scriptureHtml;
  const scriptureSectionLegacy = `<div style="flex:1 1 auto;min-height:0;overflow:hidden;display:flex;flex-direction:column">${columnsInnerLegacy}</div>`;
  node.innerHTML =
    `<div class="scripture-page-stack holman-study-stack" style="height:${h}px;overflow:hidden;display:flex;flex-direction:column;${width}min-height:0;box-sizing:border-box">` +
    scriptureSectionLegacy +
    connectionsHtml +
    footnotesHtml +
    `</div>`;
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
  const columnH = readerScriptureColumnsHeightPx(contentHeightPx);
  const columnCount = options?.columnCount ?? 2;
  const width =
    options?.measureWidthPx != null && options.measureWidthPx > 0
      ? `width:${Math.round(options.measureWidthPx)}px;`
      : "width:100%;";
  node.innerHTML =
    `<div class="${columnsClassName}" style="height:${columnH}px;max-height:${columnH}px;overflow:hidden;${width}min-height:0;box-sizing:border-box;column-fill:auto;-webkit-column-fill:auto;columns:${columnCount}">` +
    `${bodyHtml}</div>`;
}

/** True when block content extends past the column box (vertical clip at page bottom). */
function scriptureColumnsHaveClippedOverflow(columns: HTMLElement): boolean {
  if (columns.scrollWidth > columns.clientWidth + 2) return true;
  if (columns.scrollHeight > columns.clientHeight + 1) return true;

  const box = columns.getBoundingClientRect();
  if (box.height <= 0) return false;

  const clipBottom = box.bottom - READER_LIVE_COLUMN_SAFETY_PX;
  const clipRight = box.right - 6;
  const blocks = columns.querySelectorAll(
    ".scripture-paragraph, .scripture-heading, .scripture-plate",
  );
  for (let i = 0; i < blocks.length; i++) {
    const rect = blocks[i]!.getBoundingClientRect();
    if (rect.height <= 0 && rect.width <= 0) continue;
    if (rect.bottom > clipBottom) return true;
    if (rect.right > clipRight) return true;
  }
  return false;
}

function resetColumnMeasureStyles(col: HTMLElement): void {
  col.style.height = "";
  col.style.maxHeight = "";
  col.style.overflow = "";
}

/** True when a spread slice stays in the left page's two columns (not col 3+). */
export function scriptureSpreadLeftPaneFits(
  columns: HTMLElement,
  pageWidthPx: number,
): boolean {
  if (scriptureColumnsHaveClippedOverflow(columns)) return false;
  if (pageWidthPx <= 0) return true;

  const box = columns.getBoundingClientRect();
  if (box.width <= 0) return true;

  // In 4-column spread measure, column 3 begins at the right-page boundary (~pageWidth).
  const leftPaneRight = box.left + pageWidthPx - 4;
  const blocks = columns.querySelectorAll(
    ".scripture-paragraph, .scripture-heading, .scripture-plate",
  );
  for (let i = 0; i < blocks.length; i++) {
    const rect = blocks[i]!.getBoundingClientRect();
    if (rect.height <= 0 && rect.width <= 0) continue;
    if (rect.left >= leftPaneRight) return false;
  }
  return true;
}

export function measureNodeScriptureColumnsEl(node: HTMLDivElement): HTMLElement | null {
  const studyStack = node.querySelector(".scripture-page-stack, .holman-study-stack") as HTMLElement | null;
  if (studyStack) {
    return studyStack.querySelector('[class*="scripture-columns"]') as HTMLElement | null;
  }
  return node.firstElementChild as HTMLElement | null;
}

/**
 * True when rendered content fits within the page text area (incl. multi-column flow).
 * Detects clipped overflow columns via scrollWidth and block geometry.
 */
export function scriptureContentFitsPage(
  node: HTMLDivElement,
  contentHeightPx: number,
  columnsClassName?: string,
): boolean {
  const limit = Math.max(1, Math.round(contentHeightPx));
  const studyStack = node.querySelector(".scripture-page-stack, .holman-study-stack") as HTMLElement | null;
  if (studyStack) {
    studyStack.style.height = `${limit}px`;
    studyStack.style.maxHeight = `${limit}px`;
    studyStack.style.overflow = "hidden";

    let fits = studyStack.scrollHeight <= limit + 1;
    const columns = studyStackScriptureColumnsEl(studyStack);
    if (columns && fits) {
      if (columns.clientHeight <= 0) fits = false;
      if (scriptureColumnsHaveClippedOverflow(columns)) fits = false;
    }
    const connections = studyStack.querySelector(".scripture-connections-row") as HTMLElement | null;
    if (connections && fits) {
      const stackRect = studyStack.getBoundingClientRect();
      const connRect = connections.getBoundingClientRect();
      if (connRect.bottom > stackRect.bottom + 1) fits = false;
    }
    const footnotes = studyStackFootnotesEl(studyStack);
    if (footnotes && fits) {
      const stackRect = studyStack.getBoundingClientRect();
      const notesRect = footnotes.getBoundingClientRect();
      if (notesRect.bottom > stackRect.bottom + 1) fits = false;
    }

    studyStack.style.height = "";
    studyStack.style.maxHeight = "";
    studyStack.style.overflow = "";
    return fits;
  }
  if (!columnsClassName) {
    return node.scrollHeight <= limit;
  }
  const col = node.firstElementChild as HTMLElement | null;
  if (!col) return true;

  const columnLimit = readerScriptureColumnsHeightPx(limit);
  col.style.height = `${columnLimit}px`;
  col.style.maxHeight = `${columnLimit}px`;
  col.style.overflow = "hidden";

  try {
    return !scriptureColumnsHaveClippedOverflow(col);
  } finally {
    resetColumnMeasureStyles(col);
  }
}
