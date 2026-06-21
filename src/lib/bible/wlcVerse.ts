import { wlcSegmentsForChapter } from "@/lib/code-lab/wlcLoader";
import { findBookByAbbr } from "@/data/books";

/** Hebrew verse text from bundled WLC (OT only). */
export async function fetchWlcVerseText(
  bookAbbr: string,
  chapter: number,
  verse: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const book = findBookByAbbr(bookAbbr);
  if (!book || book.testament !== "OT") return null;
  const segments = await wlcSegmentsForChapter(
    bookAbbr,
    book.name,
    chapter,
    verse,
    verse,
    signal,
  );
  return segments[0]?.raw ?? null;
}

export async function fetchWlcChapterTexts(
  bookAbbr: string,
  chapter: number,
  signal?: AbortSignal,
): Promise<Map<number, string>> {
  const book = findBookByAbbr(bookAbbr);
  if (!book || book.testament !== "OT") return new Map();
  const segments = await wlcSegmentsForChapter(bookAbbr, book.name, chapter, undefined, undefined, signal);
  return new Map(segments.map((s) => [s.verse, s.raw]));
}
