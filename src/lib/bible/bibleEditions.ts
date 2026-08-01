import type { BibleEntry } from "@/lib/bible/api";
import { GOLDEN_CSB_BIBLE_ID } from "@/lib/bible/goldenChapters";

/**
 * Stable identifier baked into the shipped CSB chapter bundles.
 *
 * It originated with API.Bible, so it must not change: highlights, notes, and
 * local chapter keys use it as part of their permanent verse identity.
 */
export const API_BIBLE_CSB_ID = GOLDEN_CSB_BIBLE_ID;

/** Full editions whose text is packaged with this application. */
export const BUNDLED_BIBLE_ENTRIES = [
  {
    id: API_BIBLE_CSB_ID,
    abbreviation: "CSB",
    name: "Christian Standard Bible",
    language: { id: "eng", name: "English" },
    description: "Full text bundled with this app for reliable offline reading.",
  },
] as const satisfies readonly BibleEntry[];

export function isBundledBibleId(bibleId: string | null | undefined): boolean {
  return BUNDLED_BIBLE_ENTRIES.some((edition) => edition.id === bibleId);
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
