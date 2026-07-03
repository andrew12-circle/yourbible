/**
 * Bulk-ingest CSB into canonical JSON bundles (verses + layout metadata).
 *
 * Usage:
 *   npm run ingest:csb
 *   npm run ingest:csb -- --book Jos --chapter 11
 *
 * Output: public/bibles/csb/chapters/{Abbr}/{chapter}.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BOOKS } from "../src/data/books";
import { parsePassageHtml } from "../src/lib/bible/parsePassageHtml";
import { normalizePassage } from "../src/lib/bible/api";
import { passageToCanonicalChapter } from "../src/lib/bible/canonical/passageToCanonical";
import { GOLDEN_CSB_BIBLE_ID } from "../src/lib/bible/goldenChapters";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/bibles/csb/chapters");
const API_BASE = "https://rest.api.bible/v1";

const BOOK_USFM: Record<string, string> = {
  Gen: "GEN", Exo: "EXO", Lev: "LEV", Num: "NUM", Deu: "DEU",
  Jos: "JOS", Jdg: "JDG", Rut: "RUT", "1Sa": "1SA", "2Sa": "2SA",
  "1Ki": "1KI", "2Ki": "2KI", "1Ch": "1CH", "2Ch": "2CH", Ezr: "EZR",
  Neh: "NEH", Est: "EST", Job: "JOB", Psa: "PSA", Pro: "PRO", Ecc: "ECC",
  Sng: "SNG", Isa: "ISA", Jer: "JER", Lam: "LAM", Ezk: "EZK", Dan: "DAN",
  Hos: "HOS", Jol: "JOL", Amo: "AMO", Oba: "OBA", Jon: "JON", Mic: "MIC",
  Nam: "NAM", Hab: "HAB", Zep: "ZEP", Hag: "HAG", Zec: "ZEC", Mal: "MAL",
  Mat: "MAT", Mrk: "MRK", Luk: "LUK", Jhn: "JHN", Act: "ACT", Rom: "ROM",
  "1Co": "1CO", "2Co": "2CO", Gal: "GAL", Eph: "EPH", Php: "PHP", Col: "COL",
  "1Th": "1TH", "2Th": "2TH", "1Ti": "1TI", "2Ti": "2TI", Tit: "TIT",
  Phm: "PHM", Heb: "HEB", Jas: "JAS", "1Pe": "1PE", "2Pe": "2PE",
  "1Jn": "1JN", "2Jn": "2JN", "3Jn": "3JN", Jud: "JUD", Rev: "REV",
};

function loadApiKey(): string | null {
  if (process.env.API_BIBLE_KEY) return process.env.API_BIBLE_KEY.trim();
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^API_BIBLE_KEY=(?:"([^"]+)"|(\S+))/);
    if (m) return (m[1] ?? m[2]).trim();
  }
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let book: string | null = null;
  let chapter: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--book") book = args[++i] ?? null;
    if (args[i] === "--chapter") chapter = Number(args[++i]);
  }
  return { book, chapter };
}

async function fetchChapterHtml(apiKey: string, bibleId: string, bookAbbr: string, chapter: number) {
  const usfm = BOOK_USFM[bookAbbr];
  if (!usfm) throw new Error(`No USFM for ${bookAbbr}`);
  const passageId = `${usfm}.${chapter}`;
  const url =
    `${API_BASE}/bibles/${bibleId}/passages/${passageId}` +
    "?content-type=html&include-notes=true&include-titles=true" +
    "&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false";
  const r = await fetch(url, { headers: { "api-key": apiKey } });
  if (!r.ok) throw new Error(`${passageId} failed: ${r.status}`);
  const json = (await r.json()) as { data?: { content?: string } };
  return json?.data?.content ?? "";
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error("Set API_BIBLE_KEY in .env");
    process.exit(1);
  }
  const { book: filterBook, chapter: filterChapter } = parseArgs();
  const bibleId = process.env.GOLDEN_CSB_BIBLE_ID?.trim() ?? GOLDEN_CSB_BIBLE_ID;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  for (let bookOrder = 0; bookOrder < BOOKS.length; bookOrder++) {
    const { abbr, chapters: chapterCount } = BOOKS[bookOrder]!;
    if (filterBook && abbr !== filterBook) continue;
    const bookDir = path.join(OUT_DIR, abbr);
    fs.mkdirSync(bookDir, { recursive: true });

    for (let ch = 1; ch <= chapterCount; ch++) {
      if (filterChapter && ch !== filterChapter) continue;
      const outPath = path.join(bookDir, `${ch}.json`);
      if (fs.existsSync(outPath) && !filterBook) continue;

      process.stdout.write(`Ingest ${abbr} ${ch}… `);
      const html = await fetchChapterHtml(apiKey, bibleId, abbr, ch);
      const reference = `${abbr} ${ch}`;
      const parsed = normalizePassage(parsePassageHtml(html, reference));
      const record = passageToCanonicalChapter(parsed, abbr, ch, bibleId);
      record.verses.forEach((v) => {
        v.bookOrder = bookOrder;
      });
      fs.writeFileSync(outPath, JSON.stringify(record));
      console.log("ok");
      written += 1;
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  fs.mkdirSync(path.join(ROOT, "public/bibles/csb"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "public/bibles/csb/meta.json"),
    JSON.stringify({ bibleId, textRevision: "api-bible-csb-2024", chaptersWritten: written }, null, 2),
  );
  console.log(`Done. ${written} chapter(s) written.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
