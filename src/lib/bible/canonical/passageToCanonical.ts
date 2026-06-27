import type { Passage, PassageVerse } from "@/lib/bible/api";
import { API_BIBLE_CSB_ID } from "@/lib/bible/bibleEditions";
import { CSB_TEXT_REVISION, isCsbEdition } from "@/lib/bible/textRevision";
import type { CanonicalChapterRecord, CanonicalVerse, ChapterLayout, ChapterStudyMeta } from "./types";
import { bookOrderForAbbr, chapterCacheKey, makeVerseId } from "./verseId";

export const CANONICAL_CSB_BIBLE_ID = API_BIBLE_CSB_ID;
export const CANONICAL_CSB_ABBR = "CSB";

export function isCanonicalCsbBible(bibleId: string, abbreviation?: string): boolean {
  if (bibleId === CANONICAL_CSB_BIBLE_ID) return true;
  return isCsbEdition(abbreviation ?? "", "");
}

export function passageToCanonicalChapter(
  passage: Passage,
  bookAbbr: string,
  chapter: number,
  bibleId: string = CANONICAL_CSB_BIBLE_ID,
): CanonicalChapterRecord {
  const textRevision = passage.textRevision ?? CSB_TEXT_REVISION;
  const bookOrder = bookOrderForAbbr(bookAbbr);
  const verses: CanonicalVerse[] = passage.verses.map((v) => ({
    verseId: makeVerseId(bibleId, bookAbbr, chapter, v.number),
    bibleId,
    bookAbbr,
    bookOrder,
    chapter,
    verse: v.number,
    text: v.text,
    textRevision,
  }));

  const studyByVerse: ChapterStudyMeta[] = passage.verses
    .filter((v) => v.parts?.length || v.crossRefs?.length || v.footnotes?.length)
    .map((v) => studyMetaFromVerse(v, bibleId, bookAbbr, chapter));

  const layout: ChapterLayout = {
    bibleId,
    bookAbbr,
    chapter,
    paragraphStarts: passage.paragraphStarts,
    headings: passage.headings,
    poetryBlocks: passage.poetryBlocks ?? [],
    studyByVerse: studyByVerse.length > 0 ? studyByVerse : undefined,
  };

  return {
    key: chapterCacheKey(bibleId, bookAbbr, chapter),
    bibleId,
    bookAbbr,
    chapter,
    textRevision,
    verses,
    layout,
    cachedAt: Date.now(),
  };
}

function studyMetaFromVerse(
  v: PassageVerse,
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): ChapterStudyMeta {
  return {
    verseId: makeVerseId(bibleId, bookAbbr, chapter, v.number),
    parts: v.parts,
    crossRefs: v.crossRefs,
    footnotes: v.footnotes,
  };
}

export function canonicalChapterToPassage(record: CanonicalChapterRecord): Passage {
  const studyById = new Map(
    (record.layout.studyByVerse ?? []).map((s) => [s.verseId, s]),
  );
  return {
    reference: `${record.bookAbbr} ${record.chapter}`,
    textRevision: record.textRevision,
    paragraphStarts: record.layout.paragraphStarts,
    headings: record.layout.headings,
    poetryBlocks: record.layout.poetryBlocks,
    verses: record.verses.map((cv) => {
      const study = studyById.get(cv.verseId);
      return {
        number: cv.verse,
        text: cv.text,
        parts: study?.parts,
        crossRefs: study?.crossRefs,
        footnotes: study?.footnotes,
      };
    }),
  };
}
