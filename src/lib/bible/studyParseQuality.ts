import type { PassageVerse } from "@/lib/bible/api";
import { collectHolmanXrefsFromVerses } from "@/lib/bible/holmanStudyLayout";
import { collectFootnotes, verseParts } from "@/lib/bible/verseParts";

/** Patterns that should not appear in cleaned verse body text when study notes parsed correctly. */
const STUDY_DEBRIS_PATTERNS = [
  /\bLit\s+[A-Za-z]/,
  /\bOr\s+[A-Za-z]/,
  /\b\d+:\d+\s+[A-Za-z]{1,3}\s+\d+/,
  /\b(?:Mt|Mk|Lk|Jhn|Jn|Rom|Rm|Gen|Gn|Ps|Rev)\s+\d+:\d+/,
  /\bSome mss\b/i,
  /^\s*#\s*$/,
];

export interface VerseParseSnapshot {
  number: number;
  textLength: number;
  textPreview: string;
  crossRefLabels: string[];
  footnoteMarkers: number[];
}

export interface ChapterParseSnapshot {
  edition: string;
  book: string;
  chapter: number;
  reference: string;
  verseCount: number;
  versesWithCrossRefs: number;
  versesWithFootnotes: number;
  verses: VerseParseSnapshot[];
}

export function verseHasStudyDebris(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return STUDY_DEBRIS_PATTERNS.some((re) => re.test(t));
}

export function findVersesWithStudyDebris(verses: PassageVerse[]): PassageVerse[] {
  return verses.filter((v) => verseHasStudyDebris(v.text));
}

/** False when study markup leaked into verse bodies — prefer inline / hide Holman blocks. */
export function chapterStudyParseReliable(verses: PassageVerse[]): boolean {
  return findVersesWithStudyDebris(verses).length === 0;
}

export function buildChapterParseSnapshot(
  edition: string,
  book: string,
  chapter: number,
  reference: string,
  verses: PassageVerse[],
): ChapterParseSnapshot {
  const versesWithCrossRefs = verses.filter((v) =>
    collectHolmanXrefsFromVerses([v], chapter).length > 0,
  ).length;
  const versesWithFootnotes = verses.filter((v) => collectFootnotes(verseParts(v)).length > 0).length;

  return {
    edition,
    book,
    chapter,
    reference,
    verseCount: verses.length,
    versesWithCrossRefs,
    versesWithFootnotes,
    verses: verses.map((v) => ({
      number: v.number,
      textLength: v.text.length,
      textPreview: v.text.slice(0, 80),
      crossRefLabels: collectHolmanXrefsFromVerses([v], chapter).map((x) => x.label),
      footnoteMarkers: collectFootnotes(verseParts(v)).map((f) => f.marker),
    })),
  };
}
