import { WLC_BIBLE_ID } from "@/lib/bible/canon";
import type { VerseSegment } from "@/lib/code-lab/types";

export interface WlcBookJson {
  book: string;
  chapters: { chapter: number; verses: { number: number; text: string }[] }[];
}

const WLC_FILE_MAP: Record<string, string> = {
  Gen: "Gen",
  Exo: "Exod",
  Lev: "Lev",
  Num: "Num",
  Deu: "Deut",
  Jos: "Josh",
  Jdg: "Judg",
  Rut: "Ruth",
  "1Sa": "1Sam",
  "2Sa": "2Sam",
  "1Ki": "1Kgs",
  "2Ki": "2Kgs",
  "1Ch": "1Chr",
  "2Ch": "2Chr",
  Ezr: "Ezra",
  Neh: "Neh",
  Est: "Esth",
  Job: "Job",
  Psa: "Ps",
  Pro: "Prov",
  Ecc: "Eccl",
  Sng: "Song",
  Isa: "Isa",
  Jer: "Jer",
  Lam: "Lam",
  Ezk: "Ezek",
  Dan: "Dan",
  Hos: "Hos",
  Jol: "Joel",
  Amo: "Amos",
  Oba: "Obad",
  Jon: "Jonah",
  Mic: "Mic",
  Nam: "Nah",
  Hab: "Hab",
  Zep: "Zeph",
  Hag: "Hag",
  Zec: "Zech",
  Mal: "Mal",
};

const bookCache = new Map<string, WlcBookJson>();

export function isWlcBibleId(bibleId: string): boolean {
  return bibleId === WLC_BIBLE_ID;
}

async function fetchWlcBook(bookAbbr: string, signal?: AbortSignal): Promise<WlcBookJson> {
  const cached = bookCache.get(bookAbbr);
  if (cached) return cached;

  const localUrl = `/hebrew/wlc/${bookAbbr}.json`;
  const localRes = await fetch(localUrl, { signal });
  if (localRes.ok) {
    const data = (await localRes.json()) as WlcBookJson;
    bookCache.set(bookAbbr, data);
    return data;
  }

  const morphName = WLC_FILE_MAP[bookAbbr];
  if (!morphName) throw new Error(`Unknown WLC book: ${bookAbbr}`);

  const remoteUrl = `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${morphName}.xml`;
  const remoteRes = await fetch(remoteUrl, { signal });
  if (!remoteRes.ok) throw new Error(`WLC fetch failed: ${bookAbbr} (${remoteRes.status})`);

  const xml = await remoteRes.text();
  const data = parseWlcXml(xml, bookAbbr);
  bookCache.set(bookAbbr, data);
  return data;
}

function stripXmlTags(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export function parseWlcXml(xml: string, bookAbbr: string): WlcBookJson {
  const chapters: Record<number, { number: number; text: string }[]> = {};
  const verseRe =
    /<verse[^>]*osisID="[^"]+\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
  let m: RegExpExecArray | null;
  while ((m = verseRe.exec(xml)) !== null) {
    const chapter = Number(m[1]);
    const verse = Number(m[2]);
    const text = stripXmlTags(m[3] ?? "");
    if (!chapter || !verse || !text) continue;
    if (!chapters[chapter]) chapters[chapter] = [];
    chapters[chapter].push({ number: verse, text });
  }

  return {
    book: bookAbbr,
    chapters: Object.keys(chapters)
      .map(Number)
      .sort((a, b) => a - b)
      .map((ch) => ({
        chapter: ch,
        verses: chapters[ch]!.sort((a, b) => a.number - b.number),
      })),
  };
}

export async function wlcSegmentsForChapter(
  bookAbbr: string,
  bookName: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
  signal?: AbortSignal,
): Promise<VerseSegment[]> {
  const book = await fetchWlcBook(bookAbbr, signal);
  const ch = book.chapters.find((c) => c.chapter === chapter);
  if (!ch) return [];

  const segments: VerseSegment[] = [];
  for (const v of ch.verses) {
    if (verseStart != null && v.number < verseStart) continue;
    if (verseEnd != null && v.number > verseEnd) continue;
    segments.push({
      book: bookAbbr,
      bookName,
      chapter,
      verse: v.number,
      raw: v.text,
    });
  }
  return segments;
}
