export type ReaderColumnLayout = "single" | "double";

export const LS_READER_COLUMN_LAYOUT = "yb.reader.columnLayout";

export function readReaderColumnLayout(): ReaderColumnLayout {
  try {
    const stored = localStorage.getItem(LS_READER_COLUMN_LAYOUT);
    if (stored === "single" || stored === "double") return stored;
  } catch {
    /* ignore */
  }
  return "single";
}

/**
 * Column layout for page mode. Scroll mode is always single (no CSS columns).
 * User preference from settings applies whenever pages mode is active.
 */
export function effectiveReaderColumnLayout(options: {
  stored?: ReaderColumnLayout;
  scrollMode?: boolean;
}): ReaderColumnLayout {
  if (options.scrollMode) return "single";
  return options.stored ?? "single";
}

export function writeReaderColumnLayout(layout: ReaderColumnLayout): void {
  try {
    localStorage.setItem(LS_READER_COLUMN_LAYOUT, layout);
  } catch {
    /* ignore */
  }
}

export function readerColumnClassName(layout: ReaderColumnLayout): string {
  return layout === "double" ? "scripture-columns-2" : "";
}

/** Four columns across an open-book spread (paginator measurement only). */
export const READER_SPREAD_COLUMNS_CLASS = "scripture-columns-spread";

export function readerColumnLayoutLabel(layout: ReaderColumnLayout): string {
  return layout === "double" ? "Two columns per page" : "Single column";
}
