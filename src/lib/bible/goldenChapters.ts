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
    id: "csb-psa-3",
    book: "Psa",
    usfm: "PSA",
    chapter: 3,
    reference: "Psalm 3",
    minVerseCount: 3,
    minVersesWithCrossRefs: 0,
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
  {
    id: "csb-gen-1",
    book: "Gen",
    usfm: "GEN",
    chapter: 1,
    reference: "Genesis 1",
    minVerseCount: 30,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-exo-20",
    book: "Exo",
    usfm: "EXO",
    chapter: 20,
    reference: "Exodus 20",
    minVerseCount: 24,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-deu-6",
    book: "Deu",
    usfm: "DEU",
    chapter: 6,
    reference: "Deuteronomy 6",
    minVerseCount: 24,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-psa-22",
    book: "Psa",
    usfm: "PSA",
    chapter: 22,
    reference: "Psalm 22",
    minVerseCount: 30,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-pro-3",
    book: "Pro",
    usfm: "PRO",
    chapter: 3,
    reference: "Proverbs 3",
    minVerseCount: 34,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-isa-53",
    book: "Isa",
    usfm: "ISA",
    chapter: 53,
    reference: "Isaiah 53",
    minVerseCount: 11,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-mat-5",
    book: "Mat",
    usfm: "MAT",
    chapter: 5,
    reference: "Matthew 5",
    minVerseCount: 47,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-luk-15",
    book: "Luk",
    usfm: "LUK",
    chapter: 15,
    reference: "Luke 15",
    minVerseCount: 31,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-luk-23",
    book: "Luk",
    usfm: "LUK",
    chapter: 23,
    reference: "Luke 23",
    minVerseCount: 55,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
  {
    id: "csb-rev-21",
    book: "Rev",
    usfm: "REV",
    chapter: 21,
    reference: "Revelation 21",
    minVerseCount: 26,
    minVersesWithCrossRefs: 0,
    spotCheckCrossRefs: {},
  },
];

export function goldenFixtureHtmlPath(id: string): string {
  return `src/lib/bible/fixtures/golden/${id}.html`;
}

export function goldenFixtureSnapshotPath(id: string): string {
  return `src/lib/bible/fixtures/golden/${id}.snapshot.json`;
}
