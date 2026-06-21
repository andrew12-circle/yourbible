export interface SblgntWord {
  word: string;
  lemma: string;
  pos: string;
  strongs?: string;
}

export interface SblgntVerseJson {
  number: number;
  text: string;
  words: SblgntWord[];
}

export interface SblgntBookJson {
  book: string;
  chapters: { chapter: number; verses: SblgntVerseJson[] }[];
}

const SBLGNT_FILE_MAP: Record<string, string> = {
  Mat: "Mat",
  Mrk: "Mrk",
  Luk: "Luk",
  Jhn: "Jhn",
  Act: "Act",
  Rom: "Rom",
  "1Co": "1Co",
  "2Co": "2Co",
  Gal: "Gal",
  Eph: "Eph",
  Php: "Php",
  Col: "Col",
  "1Th": "1Th",
  "2Th": "2Th",
  "1Ti": "1Ti",
  "2Ti": "2Ti",
  Tit: "Tit",
  Phm: "Phm",
  Heb: "Heb",
  Jas: "Jas",
  "1Pe": "1Pe",
  "2Pe": "2Pe",
  "1Jn": "1Jn",
  "2Jn": "2Jn",
  "3Jn": "3Jn",
  Jud: "Jud",
  Rev: "Rev",
};

const bookCache = new Map<string, SblgntBookJson>();

async function fetchSblgntBook(bookAbbr: string, signal?: AbortSignal): Promise<SblgntBookJson> {
  const cached = bookCache.get(bookAbbr);
  if (cached) return cached;

  const fileKey = SBLGNT_FILE_MAP[bookAbbr];
  if (!fileKey) throw new Error(`Unknown SBLGNT book: ${bookAbbr}`);

  const localUrl = `/greek/sblgnt/${fileKey}.json`;
  const res = await fetch(localUrl, { signal });
  if (!res.ok) {
    throw new Error(
      `SBLGNT text not found for ${bookAbbr}. Run: npm run generate:sblgnt`,
    );
  }
  const data = (await res.json()) as SblgntBookJson;
  bookCache.set(bookAbbr, data);
  return data;
}

export async function sblgntVerseForReference(
  bookAbbr: string,
  chapter: number,
  verse: number,
  signal?: AbortSignal,
): Promise<SblgntVerseJson | null> {
  const book = await fetchSblgntBook(bookAbbr, signal);
  const ch = book.chapters.find((c) => c.chapter === chapter);
  return ch?.verses.find((v) => v.number === verse) ?? null;
}
