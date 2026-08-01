/**
 * Build the compact full-text index used by the offline CSB search dialog.
 *
 * This reads only the already-committed local bundles; it never contacts a
 * Bible service. Run after an approved CSB bundle update.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHAPTERS_DIR = join(ROOT, "public", "bibles", "csb", "chapters");
const OUT_FILE = join(ROOT, "public", "bibles", "csb", "search.json");

const records = [];
for (const bookAbbr of readdirSync(CHAPTERS_DIR).sort()) {
  const bookDir = join(CHAPTERS_DIR, bookAbbr);
  for (const file of readdirSync(bookDir).filter((name) => name.endsWith(".json"))) {
    const record = JSON.parse(readFileSync(join(bookDir, file), "utf8"));
    records.push(record);
  }
}

records.sort((a, b) => {
  const orderA = a.verses?.[0]?.bookOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.verses?.[0]?.bookOrder ?? Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.chapter - b.chapter;
});

const first = records[0];
if (!first?.bibleId) throw new Error("No CSB chapter bundles found");

const verses = records.flatMap((record) =>
  record.verses.map((verse) => [verse.bookAbbr, verse.chapter, verse.verse, verse.text]),
);
writeFileSync(OUT_FILE, `${JSON.stringify({ bibleId: first.bibleId, verses })}\n`);
console.log(`Wrote ${verses.length} verses to ${OUT_FILE}`);
