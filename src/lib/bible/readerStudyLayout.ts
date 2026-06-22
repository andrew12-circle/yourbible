export type ReaderStudyLayoutPreference = "auto" | "inline" | "holman";

export const LS_READER_STUDY_LAYOUT = "yb.reader.studyLayout";

/** Default to inline — cross-refs stay tied to each verse (highest trust). */
export const READER_STUDY_LAYOUT_DEFAULT: ReaderStudyLayoutPreference = "inline";

export function readReaderStudyLayout(): ReaderStudyLayoutPreference {
  try {
    const stored = localStorage.getItem(LS_READER_STUDY_LAYOUT);
    if (stored === "inline" || stored === "holman" || stored === "auto") return stored;
  } catch {
    /* ignore */
  }
  return READER_STUDY_LAYOUT_DEFAULT;
}

export function writeReaderStudyLayout(preference: ReaderStudyLayoutPreference): void {
  try {
    localStorage.setItem(LS_READER_STUDY_LAYOUT, preference);
  } catch {
    /* ignore */
  }
}

export function studyLayoutPreferenceLabel(preference: ReaderStudyLayoutPreference): string {
  switch (preference) {
    case "inline":
      return "Inline (recommended)";
    case "holman":
      return "Holman (print style, beta)";
    default:
      return "Auto";
  }
}

export function studyLayoutPreferenceDescription(preference: ReaderStudyLayoutPreference): string {
  switch (preference) {
    case "inline":
      return "Cross-refs below each verse; footnotes stay inline with the text.";
    case "holman":
      return "Connections at the column foot — beta; use Inline for maximum accuracy.";
    default:
      return "Holman layout for CSB, NKJV, and HCSB; inline for other translations.";
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
