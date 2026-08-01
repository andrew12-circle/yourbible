import type { CanonicalChapterRecord } from "./types";
import { setCanonicalChapter } from "./store";
import { CANONICAL_CSB_BIBLE_ID } from "./passageToCanonical";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";

function isExpectedBundle(
  record: CanonicalChapterRecord,
  bookAbbr: string,
  chapter: number,
  bibleId: string,
): boolean {
  return (
    record.bibleId === bibleId &&
    record.bookAbbr === bookAbbr &&
    record.chapter === chapter &&
    record.key === `${bibleId}|${bookAbbr}|${chapter}` &&
    record.parserRevision === PASSAGE_PARSER_REVISION &&
    record.verses.length > 0
  );
}

/** Load a chapter bundle shipped under public/bibles/csb/chapters/{Abbr}/{chapter}.json */
export async function loadCanonicalBundleFromUrl(
  bookAbbr: string,
  chapter: number,
  bibleId: string = CANONICAL_CSB_BIBLE_ID,
): Promise<CanonicalChapterRecord | null> {
  try {
    const url = `/bibles/csb/chapters/${encodeURIComponent(bookAbbr)}/${chapter}.json`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const record = (await r.json()) as CanonicalChapterRecord;
    if (!isExpectedBundle(record, bookAbbr, chapter, bibleId)) return null;
    return record;
  } catch {
    return null;
  }
}

/** Persist a public bundle chapter into IndexedDB (first-launch hydration). */
export async function hydrateCanonicalBundle(
  bookAbbr: string,
  chapter: number,
  bibleId: string = CANONICAL_CSB_BIBLE_ID,
): Promise<CanonicalChapterRecord | null> {
  const record = await loadCanonicalBundleFromUrl(bookAbbr, chapter, bibleId);
  if (!record) return null;
  await setCanonicalChapter(record);
  return record;
}
