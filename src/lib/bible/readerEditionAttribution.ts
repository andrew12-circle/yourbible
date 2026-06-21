import type { BibleEntry } from "@/lib/bible/api";
import { isStudyBibleEdition, type ResolvedStudyLayout } from "@/lib/bible/readerStudyLayout";

/** One-line source attribution for the reader page chrome. */
export function formatReaderSourceLine(
  bible: BibleEntry | undefined,
  studyLayout: ResolvedStudyLayout | null,
): string | null {
  if (!bible?.abbreviation) return null;
  const label = bible.name?.trim() ? `${bible.name} (${bible.abbreviation})` : bible.abbreviation;
  if (!isStudyBibleEdition(bible.abbreviation)) {
    return `${label} · Scripture via API.Bible`;
  }
  const layoutNote =
    studyLayout === "holman"
      ? "study notes in Holman layout"
      : "study notes inline with each verse";
  return `${label} · ${layoutNote} · API.Bible`;
}

/** Short footer edition tag (e.g. CSB). */
export function readerEditionAbbreviation(bible: BibleEntry | undefined): string | null {
  const abbr = bible?.abbreviation?.trim();
  return abbr || null;
}
