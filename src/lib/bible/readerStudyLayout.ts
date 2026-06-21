export type ReaderStudyLayoutPreference = "auto" | "inline" | "holman";

export const LS_READER_STUDY_LAYOUT = "yb.reader.studyLayout";

export function readReaderStudyLayout(): ReaderStudyLayoutPreference {
  try {
    const stored = localStorage.getItem(LS_READER_STUDY_LAYOUT);
    if (stored === "inline" || stored === "holman" || stored === "auto") return stored;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function writeReaderStudyLayout(preference: ReaderStudyLayoutPreference): void {
  try {
    localStorage.setItem(LS_READER_STUDY_LAYOUT, preference);
  } catch {
    /* ignore */
  }
}

export function isStudyBibleEdition(abbr?: string | null): boolean {
  const normalized = abbr?.trim().toUpperCase();
  return normalized === "CSB" || normalized === "NKJV" || normalized === "HCSB";
}

export type ResolvedStudyLayout = "inline" | "holman";

export function resolveStudyLayout(
  preference: ReaderStudyLayoutPreference,
  bibleAbbr?: string | null,
): ResolvedStudyLayout {
  if (preference === "inline") return "inline";
  if (preference === "holman") return "holman";
  return isStudyBibleEdition(bibleAbbr) ? "holman" : "inline";
}
