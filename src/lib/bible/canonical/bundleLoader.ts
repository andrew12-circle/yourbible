import type { CanonicalChapterRecord } from "./types";
import { setCanonicalChapter } from "./store";
import { CANONICAL_CSB_BIBLE_ID } from "./passageToCanonical";

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
    if (record.bibleId !== bibleId) return null;
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
