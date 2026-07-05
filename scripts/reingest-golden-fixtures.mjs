/**
 * Rebuild canonical CSB JSON from committed golden HTML fixtures (offline).
 * Usage: npx tsx scripts/reingest-golden-fixtures.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parsePassageHtml } from "../src/lib/bible/parsePassageHtml.ts";
import { passageToCanonicalChapter } from "../src/lib/bible/canonical/passageToCanonical.ts";
import {
  GOLDEN_CSB_BIBLE_ID,
  GOLDEN_CSB_CHAPTERS,
  goldenFixtureHtmlPath,
} from "../src/lib/bible/goldenChapters.ts";
import { BOOKS } from "../src/data/books.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/bibles/csb/chapters");

for (const spec of GOLDEN_CSB_CHAPTERS) {
  const htmlPath = path.join(ROOT, goldenFixtureHtmlPath(spec.id));
  const html = fs.readFileSync(htmlPath, "utf8");
  const parsed = parsePassageHtml(html, spec.reference);
  const bookOrder = BOOKS.findIndex((b) => b.abbr === spec.book);
  const record = passageToCanonicalChapter(parsed, spec.book, spec.chapter, GOLDEN_CSB_BIBLE_ID);
  record.verses.forEach((v) => {
    v.bookOrder = bookOrder;
  });
  const outDir = path.join(OUT_DIR, spec.book);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${spec.chapter}.json`), JSON.stringify(record));
  console.log(`Updated ${spec.book} ${spec.chapter}`);
}

console.log(`Done. ${GOLDEN_CSB_CHAPTERS.length} golden chapters refreshed.`);
