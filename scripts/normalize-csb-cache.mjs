/**
 * Normalize verse text in cached CSB chapter JSON (offline, no API).
 * Applies the same whitespace / theLord cleanup as the v11 parser merge path.
 *
 * Usage: npx tsx scripts/normalize-csb-cache.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sanitizePubVerseText } from "../src/lib/bible/parsePassageHtml.ts";
import { PASSAGE_PARSER_REVISION } from "../src/lib/bible/textRevision.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CHAPTERS_DIR = path.join(ROOT, "public/bibles/csb/chapters");

function normalizeVerseText(text) {
  return sanitizePubVerseText(text.replace(/\btheLord\b/g, "the Lord"));
}

let files = 0;
let verses = 0;

for (const bookDir of fs.readdirSync(CHAPTERS_DIR)) {
  const bookPath = path.join(CHAPTERS_DIR, bookDir);
  if (!fs.statSync(bookPath).isDirectory()) continue;
  for (const file of fs.readdirSync(bookPath)) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(bookPath, file);
    const record = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let changed = false;
    for (const v of record.verses ?? []) {
      const next = normalizeVerseText(v.text ?? "");
      if (next !== v.text) {
        v.text = next;
        changed = true;
        verses += 1;
      }
    }
    if (record.parserRevision !== PASSAGE_PARSER_REVISION) {
      record.parserRevision = PASSAGE_PARSER_REVISION;
      changed = true;
    }
    if (changed) fs.writeFileSync(filePath, JSON.stringify(record));
    files += 1;
  }
}

console.log(`Normalized ${verses} verse(s) across ${files} chapter file(s).`);
