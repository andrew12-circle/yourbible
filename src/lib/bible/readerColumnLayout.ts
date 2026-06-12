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

/** Open-book spread uses two columns; phones and single-page layouts stay single. */
export function effectiveReaderColumnLayout(options: {
  spread: boolean;
  stored?: ReaderColumnLayout;
}): ReaderColumnLayout {
  if (options.spread) return "double";
  return "single";
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

/** Four columns across an open-book spread (used for unified spread flow). */
export const READER_SPREAD_COLUMNS_CLASS = "scripture-columns-spread";

export function readerColumnLayoutLabel(layout: ReaderColumnLayout): string {
  return layout === "double" ? "Two columns per page" : "Single column";
}
