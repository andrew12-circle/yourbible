export const LS_READER_DARK = "yb.reader.dark";
export const READER_DARK_CHANGE_EVENT = "yb.reader.dark-change";

export type ReaderDarkPreference = "system" | "light" | "dark";

const NIGHT_MODE_QUERY = "(prefers-color-scheme: dark)";

export function prefersColorSchemeDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.(NIGHT_MODE_QUERY).matches === true;
}

export function readReaderDarkPreference(): ReaderDarkPreference {
  try {
    const v = localStorage.getItem(LS_READER_DARK);
    if (v === "1") return "dark";
    if (v === "0") return "light";
    return "system";
  } catch {
    return "system";
  }
}

/** @deprecated Prefer readReaderDarkPreference + resolveReaderDark */
export function readReaderDarkMode(): boolean {
  return resolveReaderDark(readReaderDarkPreference());
}

export function writeReaderDarkPreference(pref: ReaderDarkPreference): void {
  try {
    if (pref === "system") localStorage.removeItem(LS_READER_DARK);
    else localStorage.setItem(LS_READER_DARK, pref === "dark" ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(READER_DARK_CHANGE_EVENT, { detail: pref }));
  }
}

export function writeReaderDarkMode(on: boolean): void {
  writeReaderDarkPreference(on ? "dark" : "light");
}

export function resolveReaderDark(pref: ReaderDarkPreference): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return prefersColorSchemeDark();
}
