export const LS_READER_DARK = "yb.reader.dark";

export function readReaderDarkMode(): boolean {
  try {
    return localStorage.getItem(LS_READER_DARK) === "1";
  } catch {
    return false;
  }
}

export function writeReaderDarkMode(on: boolean): void {
  try {
    localStorage.setItem(LS_READER_DARK, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
