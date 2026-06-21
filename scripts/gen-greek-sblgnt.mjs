/**
 * Download MorphGNT SBLGNT and emit per-book JSON for the reader.
 * Output: public/greek/sblgnt/{Abbr}.json
 *
 * Usage: node scripts/gen-greek-sblgnt.mjs
 */
import fs from "fs";
import path from "path";

const SBLGNT_BASE =
  "https://raw.githubusercontent.com/morphgnt/sblgnt/master/";

/** App abbr → MorphGNT filename */
const BOOK_FILES = {
  Mat: "61-Mt-morphgnt.txt",
  Mrk: "62-Mk-morphgnt.txt",
  Luk: "63-Lk-morphgnt.txt",
  Jhn: "64-Jn-morphgnt.txt",
  Act: "65-Ac-morphgnt.txt",
  Rom: "66-Ro-morphgnt.txt",
  "1Co": "67-1Co-morphgnt.txt",
  "2Co": "68-2Co-morphgnt.txt",
  Gal: "69-Ga-morphgnt.txt",
  Eph: "70-Eph-morphgnt.txt",
  Php: "71-Php-morphgnt.txt",
  Col: "72-Col-morphgnt.txt",
  "1Th": "73-1Th-morphgnt.txt",
  "2Th": "74-2Th-morphgnt.txt",
  "1Ti": "75-1Ti-morphgnt.txt",
  "2Ti": "76-2Ti-morphgnt.txt",
  Tit: "77-Tit-morphgnt.txt",
  Phm: "78-Phm-morphgnt.txt",
  Heb: "79-Heb-morphgnt.txt",
  Jas: "80-Jas-morphgnt.txt",
  "1Pe": "81-1Pe-morphgnt.txt",
  "2Pe": "82-2Pe-morphgnt.txt",
  "1Jn": "83-1Jn-morphgnt.txt",
  "2Jn": "84-2Jn-morphgnt.txt",
  "3Jn": "85-3Jn-morphgnt.txt",
  Jud: "86-Jud-morphgnt.txt",
  Rev: "87-Re-morphgnt.txt",
};

function normalizeLemma(raw) {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[()]/g, "")
    .toLowerCase()
    .trim();
}

function buildLemmaStrongsIndex(greekDict) {
  /** @type {Map<string, string>} */
  const index = new Map();
  for (const [id, row] of Object.entries(greekDict)) {
    const lemma = row?.lemma;
    if (!lemma) continue;
    const key = normalizeLemma(lemma);
    if (!key || index.has(key)) continue;
    index.set(key, id);
  }
  return index;
}

function parseMorphgntText(text, bookAbbr, lemmaIndex) {
  /** @type {Record<number, Record<number, { number: number, text: string, words: object[] }>>} */
  const chapters = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 7) continue;

    const bcv = parts[0];
    const chapter = Number(bcv.slice(2, 4));
    const verse = Number(bcv.slice(4, 6));
    if (!chapter || !verse) continue;

    const pos = parts[1];
    const surface = parts[4];
    const lemma = parts[6];
    const strongs = lemmaIndex.get(normalizeLemma(lemma)) ?? null;

    if (!chapters[chapter]) chapters[chapter] = {};
    if (!chapters[chapter][verse]) {
      chapters[chapter][verse] = { number: verse, text: "", words: [] };
    }

    const entry = chapters[chapter][verse];
    entry.words.push({
      word: surface,
      lemma,
      pos,
      ...(strongs ? { strongs } : {}),
    });
    entry.text = entry.text ? `${entry.text} ${surface}` : surface;
  }

  const chapterList = Object.keys(chapters)
    .map(Number)
    .sort((a, b) => a - b)
    .map((ch) => ({
      chapter: ch,
      verses: Object.values(chapters[ch]).sort((a, b) => a.number - b.number),
    }));

  return { book: bookAbbr, chapters: chapterList };
}

const strongsPath = path.join(process.cwd(), "public", "strongs", "greek.json");
if (!fs.existsSync(strongsPath)) {
  console.error("Missing public/strongs/greek.json — run: npm run fetch:strongs");
  process.exit(1);
}

const greekDict = JSON.parse(fs.readFileSync(strongsPath, "utf8"));
const lemmaIndex = buildLemmaStrongsIndex(greekDict);

const outDir = path.join(process.cwd(), "public", "greek", "sblgnt");
fs.mkdirSync(outDir, { recursive: true });

for (const [abbr, file] of Object.entries(BOOK_FILES)) {
  const url = `${SBLGNT_BASE}${file}`;
  process.stdout.write(`Fetching ${abbr} (${file})… `);
  const r = await fetch(url);
  if (!r.ok) {
    console.log(`FAILED ${r.status}`);
    continue;
  }
  const text = await r.text();
  const parsed = parseMorphgntText(text, abbr, lemmaIndex);
  const outPath = path.join(outDir, `${abbr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(parsed));
  console.log(`${parsed.chapters.length} chapters → ${outPath}`);
}

console.log("Done.");
