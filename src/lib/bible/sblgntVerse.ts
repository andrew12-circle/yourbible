import { findBookByAbbr } from "@/data/books";
import { sblgntVerseForReference, type SblgntVerseJson, type SblgntWord } from "@/lib/bible/sblgntLoader";

export type { SblgntWord, SblgntVerseJson };

/** Greek verse from bundled MorphGNT SBLGNT (NT only). */
export async function fetchSblgntVerse(
  bookAbbr: string,
  chapter: number,
  verse: number,
  signal?: AbortSignal,
): Promise<SblgntVerseJson | null> {
  const book = findBookByAbbr(bookAbbr);
  if (!book || book.testament !== "NT") return null;
  return sblgntVerseForReference(bookAbbr, chapter, verse, signal);
}

export async function fetchSblgntVerseText(
  bookAbbr: string,
  chapter: number,
  verse: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const row = await fetchSblgntVerse(bookAbbr, chapter, verse, signal);
  return row?.text ?? null;
}
