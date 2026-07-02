import dorePlatesJson from "./dorePlates.json";
import { EXTRA_PLATES } from "./extraPlates";
import tissotPlatesJson from "./tissotPlates.json";
import type { BiblePlate } from "./types";

export type { BiblePlate, BiblePlateKind, BiblePlateLicense, BiblePlateSource, ChapterContextBundle, ChapterTimelineEvent } from "./types";

export const DORE_PLATES = dorePlatesJson as BiblePlate[];
export const TISSOT_PLATES = tissotPlatesJson as BiblePlate[];

/** All chapter-linked plates, sorted by priority then verse slot. */
export const BIBLE_PLATES: BiblePlate[] = [...DORE_PLATES, ...TISSOT_PLATES, ...EXTRA_PLATES].sort((a, b) => {
  if (a.bookAbbr !== b.bookAbbr) return a.bookAbbr.localeCompare(b.bookAbbr);
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  if (a.beforeVerse !== b.beforeVerse) return a.beforeVerse - b.beforeVerse;
  return (a.priority ?? 10) - (b.priority ?? 10);
});

/** Primary inline plate per chapter opener (highest-priority artwork at verse 1). */
export function primaryOpeningPlate(bookAbbr: string, chapter: number): BiblePlate | undefined {
  const opening = BIBLE_PLATES.filter(
    (p) => p.bookAbbr === bookAbbr && p.chapter === chapter && p.beforeVerse === 1,
  );
  return opening.sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10))[0];
}
