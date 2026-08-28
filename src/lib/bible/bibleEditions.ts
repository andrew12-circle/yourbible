import type { BibleEntry } from "@/lib/bible/api";
import { GOLDEN_CSB_BIBLE_ID } from "@/lib/bible/goldenChapters";

/**
 * Stable identifier baked into the shipped CSB chapter bundles.
 *
 * It originated with API.Bible, so it must not change: highlights, notes, and
 * local chapter keys use it as part of their permanent verse identity.
 */
export const API_BIBLE_CSB_ID = GOLDEN_CSB_BIBLE_ID;

export type BibleDeliveryMode = "bundled" | "remote" | "unsupported";

export function bibleDeliveryMode(
  bibleId: string | null | undefined,
  production = import.meta.env.PROD,
): BibleDeliveryMode {
  if (bibleId !== API_BIBLE_CSB_ID) return "unsupported";
  return production ? "remote" : "bundled";
}

export const CSB_READER_ENTRY = {
  id: API_BIBLE_CSB_ID,
  abbreviation: "CSB",
  name: "Christian Standard Bible",
  language: { id: "eng", name: "English" },
  description: import.meta.env.PROD
    ? "Read online through API.Bible."
    : "Full text bundled locally for development and testing.",
} as const satisfies BibleEntry;

/** Full editions packaged only in non-production development/test builds. */
export const BUNDLED_BIBLE_ENTRIES: readonly BibleEntry[] =
  bibleDeliveryMode(API_BIBLE_CSB_ID) === "bundled" ? [CSB_READER_ENTRY] : [];

/** Editions supported by the reader regardless of production delivery mode. */
export const READER_BIBLE_ENTRIES = [CSB_READER_ENTRY] as const satisfies readonly BibleEntry[];

export function isBundledBibleId(bibleId: string | null | undefined): boolean {
  return bibleDeliveryMode(bibleId) === "bundled";
}

export function isRemoteReaderBibleId(bibleId: string | null | undefined): boolean {
  return bibleDeliveryMode(bibleId) === "remote";
}

export function isSupportedReaderBibleId(bibleId: string | null | undefined): boolean {
  return READER_BIBLE_ENTRIES.some((edition) => edition.id === bibleId);
}

export function bundledBibleEntry(bibleId: string | null | undefined): BibleEntry | undefined {
  return BUNDLED_BIBLE_ENTRIES.find((edition) => edition.id === bibleId);
}

export const API_BIBLE_EDITIONS = {
  CSB: {
    id: API_BIBLE_CSB_ID,
    abbreviation: "CSB",
    name: "Christian Standard Bible",
    /** Publisher study apparatus (span.f / xt) present in API HTML with include-notes=true */
    hasStudyApparatus: true,
  },
} as const;
