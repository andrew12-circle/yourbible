export type ReaderColumnLayout = "single" | "double";

export const LS_READER_COLUMN_LAYOUT = "yb.reader.columnLayout";

export function readReaderColumnLayout(): ReaderColumnLayout {
  try {
    const stored = localStorage.getItem(LS_READER_COLUMN_LAYOUT);
    if (stored === "single" || stored === "double") return stored;
  } catch {
    /* ignore */
  }
  return "double";
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

export function readerColumnLayoutLabel(layout: ReaderColumnLayout): string {
  return layout === "double" ? "Two columns per page" : "Single column";
}
