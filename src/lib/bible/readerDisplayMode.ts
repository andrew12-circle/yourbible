export type ReaderDisplayMode = "scroll" | "pages";

export const LS_READER_DISPLAY_MODE = "yb.reader.displayMode";

export function readReaderDisplayMode(preferScroll = false): ReaderDisplayMode {
  try {
    const stored = localStorage.getItem(LS_READER_DISPLAY_MODE);
    if (stored === "scroll" || stored === "pages") return stored;
  } catch {
    /* ignore */
  }
  return preferScroll ? "scroll" : "pages";
}

export function writeReaderDisplayMode(mode: ReaderDisplayMode): void {
  try {
    localStorage.setItem(LS_READER_DISPLAY_MODE, mode);
  } catch {
    /* ignore */
  }
}

export function readerDisplayModeLabel(mode: ReaderDisplayMode): string {
  return mode === "scroll" ? "Scroll" : "Pages";
}
