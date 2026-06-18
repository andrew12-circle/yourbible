import {
  effectiveReaderColumnLayout,
  readerColumnClassName,
  type ReaderColumnLayout,
} from "@/lib/bible/readerColumnLayout";
import type { ReaderDisplayMode } from "@/lib/bible/readerDisplayMode";

/** Columns of scripture visible across an open-book spread (0 in scroll mode). */
export type ReaderSpreadColumnCount = 0 | 1 | 2 | 4;

export interface DerivedReaderLayout {
  display: ReaderDisplayMode;
  /** Two facing pages (viewport); false in scroll mode. */
  spread: boolean;
  scrollMode: boolean;
  /** Effective column layout for page mode (scroll is always single). */
  columnLayout: ReaderColumnLayout;
  columnsPerPage: 0 | 1 | 2;
  /** Total columns across a spread (0 scroll, 1–2 single page, 2–4 spread). */
  spreadColumnCount: ReaderSpreadColumnCount;
  columnsClassName: string;
  needsPagination: boolean;
  /** BookPaginator uses four-column measure when splitting a facing spread. */
  useSpreadPaginatorMeasure: boolean;
}

/**
 * Single source of truth for reader surface layout.
 * Viewport picks spread vs single page; user picks scroll vs pages and 1 vs 2 columns per page.
 */
export function deriveReaderLayout(input: {
  displayMode: ReaderDisplayMode;
  spread: boolean;
  columnPreference: ReaderColumnLayout;
}): DerivedReaderLayout {
  const scrollMode = input.displayMode === "scroll";
  const spread = input.spread && !scrollMode;
  const columnLayout = effectiveReaderColumnLayout({
    stored: input.columnPreference,
    scrollMode,
  });
  const columnsClassName = scrollMode ? "" : readerColumnClassName(columnLayout);
  const columnsPerPage: 0 | 1 | 2 = scrollMode ? 0 : columnLayout === "double" ? 2 : 1;

  let spreadColumnCount: ReaderSpreadColumnCount = 0;
  if (!scrollMode) {
    if (spread) {
      spreadColumnCount = columnLayout === "double" ? 4 : 2;
    } else {
      spreadColumnCount = columnLayout === "double" ? 2 : 1;
    }
  }

  return {
    display: input.displayMode,
    spread,
    scrollMode,
    columnLayout,
    columnsPerPage,
    spreadColumnCount,
    columnsClassName,
    needsPagination: !scrollMode,
    useSpreadPaginatorMeasure: spread && columnLayout === "double",
  };
}
