type Chapter = { bookAbbr: string; bookName: string; chapter: number };
type PageContent = {
  verseGroups: Chapter[];
  primaryChapter: Chapter | null;
};

/** A printed running head describes this page's first AND last visible chapters. */
export function readerRunningHead(page: PageContent | null, fallback: Chapter): string {
  const first = page?.verseGroups[0] ?? page?.primaryChapter ?? fallback;
  const last = page?.verseGroups.at(-1) ?? first;
  if (first.bookAbbr !== last.bookAbbr) {
    return `${first.bookName} ${first.chapter}–${last.bookName} ${last.chapter}`;
  }
  return first.chapter === last.chapter
    ? `${first.bookName} ${first.chapter}`
    : `${first.bookName} ${first.chapter}–${last.chapter}`;
}
