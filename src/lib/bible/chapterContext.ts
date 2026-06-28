import { BIBLE_PLATES } from "@/data/biblePlates";
import type { BiblePlate, ChapterContextBundle, ChapterTimelineEvent } from "@/data/biblePlates/types";
import { STUDY_MAPS, type StudyMapEntry } from "@/lib/bible/studyBackMatter";

export type { BiblePlate };

export function platesForChapter(bookAbbr: string, chapter: number): BiblePlate[] {
  return BIBLE_PLATES.filter(
    (p) => p.bookAbbr === bookAbbr && p.chapter === chapter,
  ).sort((a, b) => {
    if (a.beforeVerse !== b.beforeVerse) return a.beforeVerse - b.beforeVerse;
    return (a.priority ?? 10) - (b.priority ?? 10);
  });
}

/** Highest-priority plate per verse slot — used inline in the reading stream. */
export function inlinePlatesForChapter(bookAbbr: string, chapter: number): BiblePlate[] {
  const all = platesForChapter(bookAbbr, chapter);
  const bestByVerse = new Map<number, BiblePlate>();
  for (const plate of all) {
    const prev = bestByVerse.get(plate.beforeVerse);
    if (!prev || (plate.priority ?? 10) < (prev.priority ?? 10)) {
      bestByVerse.set(plate.beforeVerse, plate);
    }
  }
  return [...bestByVerse.values()].sort((a, b) => a.beforeVerse - b.beforeVerse);
}

export function platesBeforeVerse(
  bookAbbr: string,
  chapter: number,
  verse: number,
): BiblePlate[] {
  return platesForChapter(bookAbbr, chapter).filter((p) => p.beforeVerse === verse);
}

export function openingPlatesForChapter(bookAbbr: string, chapter: number): BiblePlate[] {
  return platesBeforeVerse(bookAbbr, chapter, 1);
}

export function hasChapterMedia(bookAbbr: string, chapter: number): boolean {
  return chapterContext(bookAbbr, chapter).plates.length > 0
    || chapterContext(bookAbbr, chapter).mapIds.length > 0;
}

/** Maps keyed to chapters (approximate ranges). */
const CHAPTER_MAP_IDS: Array<{ bookAbbr: string; chapterMin: number; chapterMax: number; mapId: string }> = [
  { bookAbbr: "Gen", chapterMin: 12, chapterMax: 50, mapId: "abraham" },
  { bookAbbr: "Exo", chapterMin: 1, chapterMax: 40, mapId: "exodus" },
  { bookAbbr: "Jos", chapterMin: 1, chapterMax: 24, mapId: "canaan" },
  { bookAbbr: "1Ki", chapterMin: 1, chapterMax: 22, mapId: "kingdoms" },
  { bookAbbr: "2Ki", chapterMin: 1, chapterMax: 25, mapId: "kingdoms" },
  { bookAbbr: "Exo", chapterMin: 25, chapterMax: 40, mapId: "tabernacle" },
  { bookAbbr: "1Ki", chapterMin: 5, chapterMax: 8, mapId: "temple" },
  { bookAbbr: "Mat", chapterMin: 1, chapterMax: 28, mapId: "jerusalem" },
  { bookAbbr: "Mrk", chapterMin: 1, chapterMax: 16, mapId: "jerusalem" },
  { bookAbbr: "Luk", chapterMin: 1, chapterMax: 24, mapId: "jerusalem" },
  { bookAbbr: "Jhn", chapterMin: 1, chapterMax: 21, mapId: "jerusalem" },
  { bookAbbr: "Act", chapterMin: 1, chapterMax: 28, mapId: "paul" },
];

const TIMELINE_BY_BOOK: Record<string, ChapterTimelineEvent[]> = {
  Gen: [
    { id: "gen-early-bronze", label: "Patriarchal era", approxYear: "2000–1800 BC", empire: "Egypt (Middle Kingdom)" },
  ],
  Exo: [
    { id: "exo-egypt", label: "Israel in Egypt", approxYear: "1446 BC (traditional)", empire: "New Kingdom Egypt" },
    { id: "exo-hittite", label: "Hittite Empire rising", approxYear: "1400 BC", empire: "Hittites" },
  ],
  "1Ki": [
    { id: "solomon", label: "Solomon's reign", approxYear: "970–931 BC", empire: "United Israel" },
    { id: "egypt-shishak", label: "Egyptian influence", approxYear: "925 BC", empire: "Egypt" },
  ],
  Isa: [
    { id: "isa-assyria", label: "Assyrian threat", approxYear: "740–701 BC", empire: "Assyria" },
  ],
  Jer: [
    { id: "jer-babylon", label: "Babylonian siege", approxYear: "586 BC", empire: "Babylon" },
  ],
  Dan: [
    { id: "dan-babylon", label: "Babylonian exile", approxYear: "605–539 BC", empire: "Babylon" },
    { id: "dan-persia", label: "Persian period begins", approxYear: "539 BC", empire: "Persia" },
  ],
  Mat: [
    { id: "nt-rome", label: "Roman Judea", approxYear: "4 BC – AD 30", empire: "Rome" },
  ],
  Act: [
    { id: "act-rome", label: "Early church under Rome", approxYear: "AD 30–62", empire: "Rome" },
  ],
  Rev: [
    { id: "rev-domitian", label: "Imperial persecution era", approxYear: "AD 90s", empire: "Rome" },
  ],
};

const RELATED_PASSAGES: Array<{ bookAbbr: string; chapter: number; refs: string[] }> = [
  { bookAbbr: "Gen", chapter: 22, refs: ["Hebrews 11:17", "James 2:21"] },
  { bookAbbr: "Exo", chapter: 14, refs: ["Hebrews 11:29", "1 Corinthians 10:1"] },
  { bookAbbr: "Psa", chapter: 23, refs: ["John 10:11", "Revelation 7:17"] },
  { bookAbbr: "Isa", chapter: 53, refs: ["Acts 8:32", "1 Peter 2:24"] },
  { bookAbbr: "Mat", chapter: 5, refs: ["James 1:22", "Luke 6:20"] },
  { bookAbbr: "Jhn", chapter: 3, refs: ["Romans 5:8", "1 John 4:9"] },
  { bookAbbr: "Act", chapter: 2, refs: ["Joel 2:28", "Ephesians 2:20"] },
];

export function mapsForChapter(bookAbbr: string, chapter: number): StudyMapEntry[] {
  const ids = new Set<string>();
  for (const row of CHAPTER_MAP_IDS) {
    if (row.bookAbbr === bookAbbr && chapter >= row.chapterMin && chapter <= row.chapterMax) {
      ids.add(row.mapId);
    }
  }
  return STUDY_MAPS.filter((m) => ids.has(m.id));
}

export function timelineForChapter(bookAbbr: string, _chapter: number): ChapterTimelineEvent[] {
  return TIMELINE_BY_BOOK[bookAbbr] ?? [];
}

export function relatedPassagesForChapter(bookAbbr: string, chapter: number): string[] {
  return RELATED_PASSAGES.find((r) => r.bookAbbr === bookAbbr && r.chapter === chapter)?.refs ?? [];
}

export function chapterContext(bookAbbr: string, chapter: number): ChapterContextBundle {
  return {
    bookAbbr,
    chapter,
    plates: platesForChapter(bookAbbr, chapter),
    mapIds: mapsForChapter(bookAbbr, chapter).map((m) => m.id),
    timeline: timelineForChapter(bookAbbr, chapter),
    relatedPassages: relatedPassagesForChapter(bookAbbr, chapter),
  };
}
