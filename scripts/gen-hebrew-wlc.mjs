/**
 * Download Open Scriptures morphhb WLC and emit per-book JSON for Code Lab.
 * Output: public/hebrew/wlc/{Abbr}.json
 *
 * Usage: node scripts/gen-hebrew-wlc.mjs
 */
import fs from "fs";
import path from "path";

const WLC_BASE =
  "https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/";

/** Protestant abbr → morphhb filename (without .xml) */
const BOOK_FILES = {
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

function stripXmlTags(raw) {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function parseWlcBookXml(xml, bookAbbr) {
  /** @type {Record<number, { number: number, text: string }[]>} */
  const chapters = {};
  const verseRe =
    /<verse[^>]*osisID="[^"]+\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
  let m;
  while ((m = verseRe.exec(xml)) !== null) {
    const chapter = Number(m[1]);
    const verse = Number(m[2]);
    const text = stripXmlTags(m[3] ?? "");
    if (!chapter || !verse || !text) continue;
    if (!chapters[chapter]) chapters[chapter] = [];
    chapters[chapter].push({ number: verse, text });
  }

  const chapterList = Object.keys(chapters)
    .map(Number)
    .sort((a, b) => a - b)
    .map((ch) => ({
      chapter: ch,
      verses: chapters[ch].sort((a, b) => a.number - b.number),
    }));

  return { book: bookAbbr, chapters: chapterList };
}

const outDir = path.join(process.cwd(), "public", "hebrew", "wlc");
fs.mkdirSync(outDir, { recursive: true });

for (const [abbr, file] of Object.entries(BOOK_FILES)) {
  const url = `${WLC_BASE}${file}.xml`;
  process.stdout.write(`Fetching ${abbr} (${file}.xml)… `);
  const r = await fetch(url);
  if (!r.ok) {
    console.log(`FAILED ${r.status}`);
    continue;
  }
  const xml = await r.text();
  const parsed = parseWlcBookXml(xml, abbr);
  const outPath = path.join(outDir, `${abbr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(parsed));
  console.log(`${parsed.chapters.length} chapters → ${outPath}`);
}

console.log("Done.");
