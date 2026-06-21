/** Golden chapters — regression fixtures for CSB study parsing (API.Bible HTML). */

/** API.Bible id for Christian Standard Bible (see fixtures/golden/meta.json). */
export const GOLDEN_CSB_BIBLE_ID = "a556c5305ee15c3f-01";

export interface GoldenChapterSpec {
  id: string;
  book: string;
  usfm: string;
  chapter: number;
  reference: string;
  /** Minimum verses expected after parse (guards empty chapter regressions). */
  minVerseCount: number;
  /** At least this many verses should have publisher cross-refs in CSB study content. */
  minVersesWithCrossRefs: number;
  /** Spot-check: verse → expected cross-ref labels (subset match). */
  spotCheckCrossRefs: Record<number, string[]>;
}

export const GOLDEN_CSB_CHAPTERS: GoldenChapterSpec[] = [
  {
    id: "csb-jhn-1",
    book: "Jhn",
    usfm: "JHN",
    chapter: 1,
    reference: "John 1",
    minVerseCount: 50,
    minVersesWithCrossRefs: 5,
    spotCheckCrossRefs: {
      1: ["Gn 1:1"],
    },
  },
  {
    id: "csb-jhn-5",
    book: "Jhn",
    usfm: "JHN",
    chapter: 5,
    reference: "John 5",
    minVerseCount: 45,
    minVersesWithCrossRefs: 10,
    spotCheckCrossRefs: {
      30: ["Mt 12:41", "2Th 1:5"],
    },
  },
  {
    id: "csb-psa-23",
    book: "Psa",
    usfm: "PSA",
    chapter: 23,
    reference: "Psalm 23",
    minVerseCount: 6,
    minVersesWithCrossRefs: 1,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-rom-8",
    book: "Rom",
    usfm: "ROM",
    chapter: 8,
    reference: "Romans 8",
    minVerseCount: 38,
    minVersesWithCrossRefs: 5,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-exo-14",
    book: "Exo",
    usfm: "EXO",
    chapter: 14,
    reference: "Exodus 14",
    minVerseCount: 30,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-gal-5",
    book: "Gal",
    usfm: "GAL",
    chapter: 5,
    reference: "Galatians 5",
    minVerseCount: 25,
    minVersesWithCrossRefs: 3,
    spotCheckCrossRefs: {},
  },
];

export function goldenFixtureHtmlPath(id: string): string {
  return `src/lib/bible/fixtures/golden/${id}.html`;
}

export function goldenFixtureSnapshotPath(id: string): string {
  return `src/lib/bible/fixtures/golden/${id}.snapshot.json`;
}
