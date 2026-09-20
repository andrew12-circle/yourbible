import { BOOKS } from "@/data/books";
import type { VisualPassage } from "@/data/visualBible/types";

export interface VisualReferenceRange {
  book: string;
  chapter: number;
  endChapter: number;
  verse: number;
  endVerse: number;
  valid: boolean;
}

const additionalAliases: Record<string, string[]> = {
  Psa: ["Psalm"], Sng: ["Song of Songs"], Jhn: ["Jn"],
  "1Jn": ["1 Jn"], "2Jn": ["2 Jn"], "3Jn": ["3 Jn"],
};
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const aliases = BOOKS.flatMap((book) => [book.name, book.abbr, ...(additionalAliases[book.abbr] ?? [])]
  .map((alias) => ({ book, alias }))).sort((a, b) => b.alias.length - a.alias.length);
const patterns = aliases.map(({ book, alias }) => {
  // Accept both "1 John" and "1John", but never match John inside 1 John.
  const name = escapeRegex(alias).replace(/\s+/g, "\\s+").replace(/^([1-3])(?:\\s\+)?/, "$1\\s*");
  return { book, pattern: new RegExp(`(^|[^\\p{L}\\p{N}])${name}\\s*(\\d+)(?:\\s*:\\s*(\\d+))?(?:\\s*[-–—]\\s*(\\d+)(?:\\s*:\\s*(\\d+))?)?(?=$|[\\s,;.)])`, "iu") };
});

/** Extract one Scripture reference; remaining words still filter artist/title metadata. */
export function extractVisualReference(query: string): { text: string; reference?: VisualReferenceRange } {
  for (const { book, pattern } of patterns) {
    const match = pattern.exec(query);
    if (!match) continue;
    const chapter = Number(match[2]);
    const verse = match[3] === undefined ? 0 : Number(match[3]);
    const hasEnd = match[4] !== undefined;
    const verseOnlyEnd = hasEnd && match[3] !== undefined && match[5] === undefined;
    const endChapter = hasEnd && !verseOnlyEnd ? Number(match[4]) : chapter;
    const endVerse = verseOnlyEnd ? Number(match[4]) : match[5] !== undefined ? Number(match[5])
      : hasEnd || match[3] === undefined ? Infinity : verse;
    const valid = Number.isSafeInteger(chapter) && Number.isSafeInteger(endChapter)
      && chapter >= 1 && endChapter >= chapter && endChapter <= book.chapters
      && (match[3] === undefined || (Number.isSafeInteger(verse) && verse >= 1))
      && (endVerse === Infinity || (Number.isSafeInteger(endVerse) && endVerse >= 1))
      && (endChapter !== chapter || endVerse >= verse);
    return {
      text: `${query.slice(0, match.index)} ${query.slice(match.index + match[0].length)}`,
      reference: { book: book.abbr, chapter, endChapter, verse, endVerse, valid },
    };
  }
  return { text: query };
}

/** Chapter-level links are contextual matches, never promoted to verified verse-level claims. */
export function visualReferenceOverlaps(passage: VisualPassage, reference: VisualReferenceRange): boolean {
  if (!reference.valid || passage.book !== reference.book) return false;
  const endChapter = passage.endChapter ?? passage.chapter;
  const endVerse = passage.endVerse ?? passage.verse ?? Infinity;
  const startIsBeforeEnd = passage.chapter < reference.endChapter
    || (passage.chapter === reference.endChapter && (passage.verse ?? 0) <= reference.endVerse);
  const endIsAfterStart = endChapter > reference.chapter
    || (endChapter === reference.chapter && endVerse >= reference.verse);
  return startIsBeforeEnd && endIsAfterStart;
}
