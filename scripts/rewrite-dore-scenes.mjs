/**
 * One-off: rewrite scripts/data/doreScenes.js from the verified discovery map,
 * keeping only scenes with a confirmed Commons filename. Each surviving scene
 * gets an explicit `file:` so the plate generator never has to guess.
 *
 * Run after scripts/discover-dore-files.mjs. Usage: node scripts/rewrite-dore-scenes.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISCOVERED = join(__dirname, "data", "dore-files-discovered.json");
const OUT = join(__dirname, "data", "doreScenes.js");

const discovered = JSON.parse(readFileSync(DISCOVERED, "utf8"));
const resolved = discovered.filter((d) => d.filename);

const BOOK_ORDER = [
  "Gen", "Exo", "Lev", "Num", "Deu", "Jos", "Jdg", "Rut",
  "1Sa", "2Sa", "1Ki", "2Ki", "1Ch", "2Ch", "Ezr", "Neh", "Est",
  "Job", "Psa", "Pro", "Ecc", "Sng", "Isa", "Jer", "Lam", "Ezk",
  "Dan", "Hos", "Jol", "Amo", "Oba", "Jon", "Mic", "Nam", "Hab",
  "Zep", "Hag", "Zec", "Mal",
  "Mat", "Mar", "Mrk", "Luk", "Jhn", "Act", "Rom", "Rev",
];
const BOOK_LABEL = {
  Gen: "Genesis", Exo: "Exodus", Num: "Numbers", Jos: "Joshua", Jdg: "Judges",
  Rut: "Ruth", "1Sa": "Samuel", "2Sa": "Samuel", "1Ki": "Kings", "2Ki": "Kings",
  Ezr: "Ezra / Nehemiah / Esther", Neh: "Ezra / Nehemiah / Esther",
  Est: "Ezra / Nehemiah / Esther", Job: "Job", Isa: "Prophets", Jer: "Prophets",
  Ezk: "Prophets", Dan: "Prophets", Jon: "Prophets", Psa: "Psalms",
  Luk: "New Testament — Life of Christ", Mat: "New Testament — Life of Christ",
  Mar: "New Testament — Life of Christ", Jhn: "New Testament — Life of Christ",
  Act: "Acts", Rev: "Revelation",
};

function bookRank(b) {
  const i = BOOK_ORDER.indexOf(b);
  return i === -1 ? 999 : i;
}

resolved.sort((a, b) => {
  if (bookRank(a.b) !== bookRank(b.b)) return bookRank(a.b) - bookRank(b.b);
  if (a.c !== b.c) return a.c - b.c;
  return a.v - b.v;
});

function esc(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const lines = [];
lines.push("/**");
lines.push(" * Gustave Doré Bible illustrations (1866) — scene index keyed to passages.");
lines.push(" * Each `file` is the verified Wikimedia Commons filename (see");
lines.push(" * scripts/discover-dore-files.mjs, which resolves them against the");
lines.push(" * \"Doré's English Bible\" category and a hand-verified NT set).");
lines.push(" * @see https://commons.wikimedia.org/wiki/Dor%C3%A9%27s_Bible_Illustrations");
lines.push(" */");
lines.push("export default [");

let lastLabel = null;
for (const s of resolved) {
  const label = BOOK_LABEL[s.b] ?? s.b;
  if (label !== lastLabel) {
    lines.push(`  // ${label}`);
    lastLabel = label;
  }
  const parts = [
    `n: ${s.n}`,
    `t: "${esc(s.t)}"`,
    `b: "${s.b}"`,
    `c: ${s.c}`,
    `v: ${s.v}`,
    `r: "${esc(s.r)}"`,
    `file: "${esc(s.filename)}"`,
  ];
  lines.push(`  { ${parts.join(", ")} },`);
}
lines.push("];");
lines.push("");

writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`Wrote ${resolved.length} scenes → ${OUT}`);
