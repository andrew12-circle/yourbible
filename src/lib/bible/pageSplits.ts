import type { PassageVerse } from "@/lib/bible/api";

/** Shallow compare verse-index page boundaries. */
export function areSameSplits(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** True once every verse index belongs to a bounded page slice. */
export function isPageSplitsReady(splits: number[], verseCount: number): boolean {
  if (verseCount === 0) return true;
  if (splits.length < 2) return false;
  if (splits[0] !== 0) return false;
  if (splits[splits.length - 1] !== verseCount) return false;
  for (let i = 1; i < splits.length; i++) {
    if (splits[i] <= splits[i - 1]) return false;
  }
  return true;
}

export function pageCountFromSplits(splits: number[], verseCount: number): number {
  if (verseCount === 0) return 1;
  return isPageSplitsReady(splits, verseCount) ? splits.length - 1 : 1;
}

/** Verse slice for a page index, or null when splits are incomplete for that page. */
export function pageVerseSlice(
  splits: number[],
  pageIdx: number,
  verses: PassageVerse[],
): PassageVerse[] | null {
  if (!isPageSplitsReady(splits, verses.length)) return null;
  const start = splits[pageIdx];
  const end = splits[pageIdx + 1];
  if (start == null || end == null || start >= end) return null;
  return verses.slice(start, end);
}
