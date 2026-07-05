/**
 * Audit every CSB chapter for parser completeness (orphan verseless text).
 *
 * Usage:
 *   npm run audit:bible-parser
 *   npm run audit:bible-parser -- --book Mic
 *
 * Requires API_BIBLE_KEY in .env. Exits non-zero if any chapter has dropped text.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BOOKS } from "../src/data/books.ts";
import { GOLDEN_CSB_BIBLE_ID } from "../src/lib/bible/goldenChapters.ts";
import { auditChapterHtmlParse, chapterParseIsComplete } from "../src/lib/bible/bibleParserAudit.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API_BASE = "https://rest.api.bible/v1";
const CONCURRENCY = 3;
const FETCH_DELAY_MS = 150;

const BOOK_USFM = {
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

function loadApiKey() {
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
  let book = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--book") book = args[++i] ?? null;
  }
  return { book };
}

async function fetchChapterHtml(apiKey, bibleId, bookAbbr, chapter, attempt = 0) {
  const usfm = BOOK_USFM[bookAbbr];
  if (!usfm) throw new Error(`No USFM for ${bookAbbr}`);
  const url =
    `${API_BASE}/bibles/${bibleId}/chapters/${usfm}.${chapter}` +
    "?content-type=html&include-notes=false&include-titles=true" +
    "&include-chapter-numbers=false&include-verse-numbers=true";
  const r = await fetch(url, { headers: { "api-key": apiKey } });
  if (r.status === 429 || r.status === 403) {
    if (attempt >= 4) throw new Error(`${usfm}.${chapter} failed: ${r.status}`);
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    return fetchChapterHtml(apiKey, bibleId, bookAbbr, chapter, attempt + 1);
  }
  if (!r.ok) throw new Error(`${usfm}.${chapter} failed: ${r.status}`);
  const json = await r.json();
  return json?.data?.content ?? "";
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error("Set API_BIBLE_KEY in .env");
    process.exit(1);
  }

  const { book: filterBook } = parseArgs();
  const books = filterBook
    ? BOOKS.filter((b) => b.abbr.toLowerCase() === filterBook.toLowerCase())
    : BOOKS;

  if (books.length === 0) {
    console.error(`Unknown book: ${filterBook}`);
    process.exit(1);
  }

  const jobs = [];
  for (const b of books) {
    for (let ch = 1; ch <= b.chapters; ch++) {
      jobs.push({ book: b.abbr, name: b.name, chapter: ch });
    }
  }

  console.log(`Auditing ${jobs.length} chapters (CSB ${GOLDEN_CSB_BIBLE_ID})…`);

  const failures = [];

  let done = 0;
  await mapPool(jobs, CONCURRENCY, async (job) => {
    await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
    const html = await fetchChapterHtml(apiKey, GOLDEN_CSB_BIBLE_ID, job.book, job.chapter);
    const audit = auditChapterHtmlParse(html);
    if (!chapterParseIsComplete(audit)) {
      failures.push({
        ref: `${job.name} ${job.chapter}`,
        verseCount: audit.verseCount,
        orphanCharCount: audit.orphanCharCount,
        orphanTextPreview: audit.orphanTextPreview,
      });
    }
    done += 1;
    if (done % 50 === 0 || done === jobs.length) {
      process.stdout.write(`\r  ${done}/${jobs.length} chapters checked`);
    }
  });

  console.log("\n");
  if (failures.length === 0) {
    console.log(`All ${jobs.length} chapters passed — no orphan verseless text.`);
    return;
  }

  console.error(`${failures.length} chapter(s) with parser gaps:\n`);
  for (const f of failures) {
    console.error(`  ${f.ref}: ${f.orphanCharCount} orphan chars, ${f.verseCount} verses`);
    console.error(`    preview: ${f.orphanTextPreview}`);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
