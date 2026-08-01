import type { Passage } from "@/lib/bible/api";
import {
  canonicalChapterToPassage,
  isCanonicalCsbBible,
  passageToCanonicalChapter,
  CANONICAL_CSB_BIBLE_ID,
} from "./passageToCanonical";
import { getCanonicalChapter, setCanonicalChapter } from "./store";
import { hydrateCanonicalBundle } from "./bundleLoader";
import type { CanonicalChapterRecord } from "./types";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";

export { CANONICAL_CSB_BIBLE_ID, isCanonicalCsbBible };

/**
 * Read a chapter from the canonical verse store, or null if not ingested.
 * Records produced by an older parser build are treated as a miss so the
 * chapter is re-fetched and re-indexed with current formatting fixes.
 */
export async function getChapterFromCanonicalStore(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): Promise<CanonicalChapterRecord | null> {
  if (!isCanonicalCsbBible(bibleId)) return null;
  const record = await getCanonicalChapter(CANONICAL_CSB_BIBLE_ID, bookAbbr, chapter);
  if (!record) return null;
  if (record.parserRevision !== PASSAGE_PARSER_REVISION) return null;
  return record;
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
 * Read CSB from its shipped canonical bundle. Missing/corrupt local content is
 * an explicit failure: falling back to API.Bible would silently spend credits
 * and make an otherwise offline reader unreliable.
 */
export async function getChapterVerses(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
  signal?: AbortSignal,
  bibleAbbr?: string,
): Promise<Passage> {
  if (isCanonicalCsbBible(bibleId)) {
    const canonicalId = CANONICAL_CSB_BIBLE_ID;
    const bundled = await hydrateCanonicalBundle(bookAbbr, chapter, canonicalId);
    if (bundled) return canonicalChapterToPassage(bundled);
    throw new Error(
      `Bundled CSB chapter unavailable: ${bookAbbr} ${chapter}. API.Bible was not used.`,
    );
  }

  const { fetchPassage } = await import("@/lib/bible/api");
  return fetchPassage(bibleId, bookAbbr, chapter, signal, bibleAbbr);
}

export async function getChapterVersesFromCanonicalOnly(
  bibleId: string,
  bookAbbr: string,
  chapter: number,
): Promise<Passage | null> {
  const record = await getChapterFromCanonicalStore(bibleId, bookAbbr, chapter);
  return record ? canonicalChapterToPassage(record) : null;
}
