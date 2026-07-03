/** Immutable verse text — no formatting, no HTML. */
export type CanonicalVerse = {
  verseId: string;
  bibleId: string;
  bookAbbr: string;
  bookOrder: number;
  chapter: number;
  verse: number;
  text: string;
  textRevision: string;
};

/** Study markup keyed by verseId — separate from verse text. */
export type ChapterStudyMeta = {
  verseId: string;
  parts?: import("@/lib/bible/api").VersePart[];
  crossRefs?: import("@/lib/bible/api").PassageCrossRef[];
  footnotes?: import("@/lib/bible/api").PassageFootnote[];
};

/** Rendering metadata only — no Bible text. */
export type ChapterLayout = {
  bibleId: string;
  bookAbbr: string;
  chapter: number;
  paragraphStarts: number[];
  headings: { beforeVerse: number; text: string }[];
  poetryBlocks: { beforeVerse: number; level: number }[];
  studyByVerse?: ChapterStudyMeta[];
};

export type CanonicalChapterRecord = {
  key: string;
  bibleId: string;
  bookAbbr: string;
  chapter: number;
  textRevision: string;
  /** Parser build that produced this record; stale revisions are re-fetched. */
  parserRevision?: string;
  verses: CanonicalVerse[];
  layout: ChapterLayout;
  cachedAt: number;
};
