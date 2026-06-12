import fs from "fs";

const base =
  "https://raw.githubusercontent.com/EOTCOpenSource/80-weahadu/main/minified/singleChapter/";
const abbrs = [
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut", "1Sa", "2Sa", "1Ki", "2Ki", "1Ch", "2Ch",
  "Jub", "Eno", "Ezr", "Neh", "E3r", "E2r", "Tob", "Jdt", "Est", "1Mq", "2Mq", "3Mq", "Job", "Psa",
  "Pro", "Adm", "Wis", "Ecc", "Sng", "Sir", "Isa", "Jer", "Bar", "Lam", "LJr", "TBr", "Ezk", "Dan",
  "Hos", "Amo", "Mic", "Jol", "Oba", "Jon", "Nam", "Hab", "Zep", "Hag", "Zec", "Mal", "Mat", "Mrk",
  "Luk", "Jhn", "Act", "Rom", "1Co", "2Co", "Gal", "Eph", "Php", "Col", "1Th", "2Th", "1Ti", "2Ti",
  "Tit", "Phm", "Heb", "1Pe", "2Pe", "1Jn", "2Jn", "3Jn", "Jas", "Jud", "Rev",
];

function sectionFor(n, testament) {
  if (testament === "NT") {
    if (n >= 55 && n <= 58) return "gospels";
    if (n === 59) return "acts";
    if (n === 81) return "revelation";
    return "epistles";
  }
  if (n <= 5) return "law";
  if (n <= 14) return "history";
  if (n >= 15 && n <= 26) return "deuterocanon";
  if (n <= 34) return "poetry";
  return "prophets";
}

const idx = await fetch(`${base}index.json`).then((r) => r.json());
const rows = [];
for (let i = 0; i < idx.files.length; i++) {
  const f = idx.files[i];
  const book = await fetch(`${base}${f.file}`).then((r) => r.json());
  const testament = f.testament === "old" ? "OT" : "NT";
  rows.push({
    name: f.book_name_en,
    nameAm: f.book_name_am,
    abbr: abbrs[i],
    chapters: book.chapters.length,
    section: sectionFor(f.book_number, testament),
    testament,
    eotcFile: f.file,
  });
}

const lines = [
  'import type { BibleBook } from "./books";',
  "",
  "/** Ethiopian Orthodox 81-book canon — EOTCOpenSource/80-weahadu (Amharic). */",
  "export const ETHIOPIAN_BOOKS: BibleBook[] = [",
];
for (const r of rows) {
  lines.push("  {");
  lines.push(`    name: ${JSON.stringify(r.name)},`);
  lines.push(`    nameAm: ${JSON.stringify(r.nameAm)},`);
  lines.push(`    abbr: ${JSON.stringify(r.abbr)},`);
  lines.push(`    chapters: ${r.chapters},`);
  lines.push(`    section: ${JSON.stringify(r.section)},`);
  lines.push(`    testament: ${JSON.stringify(r.testament)},`);
  lines.push(`    eotcFile: ${JSON.stringify(r.eotcFile)},`);
  lines.push("  },");
}
lines.push("];", "");

fs.writeFileSync("src/data/ethiopianBooks.ts", lines.join("\n"));
console.log(`wrote ${rows.length} books`);
