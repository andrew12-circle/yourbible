export type ReadingPlanDay = {
  day: number;
  title: string;
  readings: { book: string; chapter: number }[];
};

export type ReadingPlan = {
  id: string;
  title: string;
  description: string;
  days: number;
  schedule: ReadingPlanDay[];
};

export const READING_PLANS: ReadingPlan[] = [
  {
    id: "john-21",
    title: "Gospel of John in 21 Days",
    description: "One chapter of John each day.",
    days: 21,
    schedule: Array.from({ length: 21 }, (_, i) => ({
      day: i + 1,
      title: `John ${i + 1}`,
      readings: [{ book: "Jhn", chapter: i + 1 }],
    })),
  },
  {
    id: "psalms-30",
    title: "Psalms in 30 Days",
    description: "Five psalms most days through the Psalter.",
    days: 30,
    schedule: Array.from({ length: 30 }, (_, i) => {
      const start = i * 5 + 1;
      const readings = [0, 1, 2, 3, 4]
        .map((n) => start + n)
        .filter((ch) => ch <= 150)
        .map((chapter) => ({ book: "Psa", chapter }));
      return {
        day: i + 1,
        title: readings.length === 1 ? `Psalm ${readings[0].chapter}` : `Psalms ${readings[0].chapter}–${readings[readings.length - 1].chapter}`,
        readings,
      };
    }),
  },
  {
    id: "romans-16",
    title: "Romans in 16 Days",
    description: "Walk through Paul's letter to the Romans.",
    days: 16,
    schedule: Array.from({ length: 16 }, (_, i) => ({
      day: i + 1,
      title: `Romans ${i + 1}`,
      readings: [{ book: "Rom", chapter: i + 1 }],
    })),
  },
  {
    id: "proverbs-31",
    title: "Proverbs in 31 Days",
    description: "One chapter of Proverbs per day.",
    days: 31,
    schedule: Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      title: `Proverbs ${i + 1}`,
      readings: [{ book: "Pro", chapter: i + 1 }],
    })),
  },
  {
    id: "genesis-50",
    title: "Genesis in 50 Days",
    description: "One chapter of Genesis each day.",
    days: 50,
    schedule: Array.from({ length: 50 }, (_, i) => ({
      day: i + 1,
      title: `Genesis ${i + 1}`,
      readings: [{ book: "Gen", chapter: i + 1 }],
    })),
  },
  {
    id: "nt-90",
    title: "New Testament in 90 Days",
    description: "Three to four chapters daily through the NT.",
    days: 90,
    schedule: (() => {
      const nt: { book: string; chapter: number }[] = [];
      const books: { abbr: string; chapters: number }[] = [
        { abbr: "Mat", chapters: 28 }, { abbr: "Mrk", chapters: 16 }, { abbr: "Luk", chapters: 24 },
        { abbr: "Jhn", chapters: 21 }, { abbr: "Act", chapters: 28 }, { abbr: "Rom", chapters: 16 },
        { abbr: "1Co", chapters: 16 }, { abbr: "2Co", chapters: 13 }, { abbr: "Gal", chapters: 6 },
        { abbr: "Eph", chapters: 6 }, { abbr: "Php", chapters: 4 }, { abbr: "Col", chapters: 4 },
        { abbr: "1Th", chapters: 5 }, { abbr: "2Th", chapters: 3 }, { abbr: "1Ti", chapters: 6 },
        { abbr: "2Ti", chapters: 4 }, { abbr: "Tit", chapters: 3 }, { abbr: "Phm", chapters: 1 },
        { abbr: "Heb", chapters: 13 }, { abbr: "Jas", chapters: 5 }, { abbr: "1Pe", chapters: 5 },
        { abbr: "2Pe", chapters: 3 }, { abbr: "1Jn", chapters: 5 }, { abbr: "2Jn", chapters: 1 },
        { abbr: "3Jn", chapters: 1 }, { abbr: "Jud", chapters: 1 }, { abbr: "Rev", chapters: 22 },
      ];
      for (const b of books) {
        for (let c = 1; c <= b.chapters; c++) nt.push({ book: b.abbr, chapter: c });
      }
      const perDay = Math.ceil(nt.length / 90);
      const schedule: ReadingPlanDay[] = [];
      for (let d = 0; d < 90; d++) {
        const slice = nt.slice(d * perDay, (d + 1) * perDay);
        if (slice.length === 0) break;
        schedule.push({
          day: d + 1,
          title: `Day ${d + 1}`,
          readings: slice,
        });
      }
      return schedule;
    })(),
  },
];

export function getReadingPlan(id: string): ReadingPlan | undefined {
  return READING_PLANS.find((p) => p.id === id);
}
