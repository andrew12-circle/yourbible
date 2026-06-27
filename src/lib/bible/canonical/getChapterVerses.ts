import type { Passage } from "@/lib/bible/api";
import { fetchPassage } from "@/lib/bible/api";
import {
  canonicalChapterToPassage,
  isCanonicalCsbBible,
  passageToCanonicalChapter,
  CANONICAL_CSB_BIBLE_ID,
} from "./passageToCanonical";
import { getCanonicalChapter, setCanonicalChapter } from "./store";
import type { CanonicalChapterRecord } from "./types";

export { CANONICAL_CSB_BIBLE_ID, isCanonicalCsbBible };

/** Read a chapter from the canonical verse store, or null if not ingested. */
export async function getChapterFromCanonicalStore(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): Promise<CanonicalChapterRecord | null> {
  if (!isCanonicalCsbBible(bibleId)) return null;
  return getCanonicalChapter(bibleId, bookAbbr, chapter);
}

/** Persist a parsed passage into the canonical verse store. */
export async function indexPassageInCanonicalStore(
  passage: Passage,
  bookAbbr: string,
  chapter: number,
  bibleId: string,
): Promise<CanonicalChapterRecord> {
  const record = passageToCanonicalChapter(passage, bookAbbr, chapter, bibleId);
  await setCanonicalChapter(record);
  return record;
}

/**
 * Layer 1 read adapter: CSB from canonical store when available;
 * otherwise fetch via API and index for next time.
 */
export async function getChapterVerses(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
  signal?: AbortSignal,
  bibleAbbr?: string,
): Promise<Passage> {
  if (isCanonicalCsbBible(bibleId, bibleAbbr)) {
    const cached = await getCanonicalChapter(bibleId, bookAbbr, chapter);
    if (cached) return canonicalChapterToPassage(cached);
  }

  const passage = await fetchPassage(bibleId, bookAbbr, chapter, signal, bibleAbbr);
  if (isCanonicalCsbBible(bibleId, bibleAbbr)) {
    void indexPassageInCanonicalStore(passage, bookAbbr, chapter, bibleId);
  }
  return passage;
}

export async function getChapterVersesFromCanonicalOnly(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): Promise<Passage | null> {
  const record = await getChapterFromCanonicalStore(bibleId, bookAbbr, chapter);
  return record ? canonicalChapterToPassage(record) : null;
}
