/**
 * Audit every locally bundled CSB chapter for text integrity and render completeness.
 *
 * Usage:
 *   npm run audit:canonical-bible
 *   npm run audit:canonical-bible -- --book 2Ti
 *   npm run audit:canonical-bible -- --verbose
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BOOKS } from "../src/data/books.ts";
import {
  auditCanonicalChapter,
  expectedChapterCount,
  mergeChapterAudits,
} from "../src/lib/bible/canonicalAudit.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CHAPTERS_DIR = path.join(ROOT, "public", "bibles", "csb", "chapters");

function parseArgs() {
  const args = process.argv.slice(2);
  let book = null;
  let verbose = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--book" && args[i + 1]) {
      book = args[++i];
    } else if (args[i] === "--verbose") {
      verbose = true;
    }
  }
  return { book, verbose };
}

function loadChapter(bookAbbr, chapter) {
  const filePath = path.join(CHAPTERS_DIR, bookAbbr, `${chapter}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing chapter bundle: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const { book, verbose } = parseArgs();
  const books = book ? BOOKS.filter((b) => b.abbr === book) : BOOKS;
  if (books.length === 0) {
    console.error(`Unknown book: ${book}`);
    process.exit(1);
  }

  const audits = [];
  for (const b of books) {
    for (let chapter = 1; chapter <= b.chapters; chapter++) {
      audits.push(auditCanonicalChapter(loadChapter(b.abbr, chapter)));
    }
  }

  const summary = mergeChapterAudits(audits);
  console.log(
    `Audited ${summary.chaptersAudited}/${expectedChapterCount()} chapters, ${summary.versesAudited} verses.`,
  );

  if (summary.issueCount === 0) {
    console.log("No text integrity or render completeness issues found.");
    process.exit(0);
  }

  console.error(`Found ${summary.issueCount} issue(s) in ${summary.chapterIssues.length} chapter(s).`);
  for (const issue of summary.issues.slice(0, verbose ? summary.issueCount : 50)) {
    console.error(
      `  ${issue.bookAbbr} ${issue.chapter}:${issue.verse} [${issue.kind}] ${issue.detail}`,
    );
  }
  if (!verbose && summary.issueCount > 50) {
    console.error(`  ... and ${summary.issueCount - 50} more (use --verbose)`);
  }
  process.exit(1);
}

main();
