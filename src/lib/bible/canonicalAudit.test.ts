import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BOOKS } from "@/data/books";
import {
  auditCanonicalChapter,
  expectedChapterCount,
  mergeChapterAudits,
} from "@/lib/bible/canonicalAudit";
import type { CanonicalChapterRecord } from "@/lib/bible/canonical/types";

const CHAPTERS_DIR = path.join(process.cwd(), "public", "bibles", "csb", "chapters");

function loadChapterJson(bookAbbr: string, chapter: number): CanonicalChapterRecord {
  const filePath = path.join(CHAPTERS_DIR, bookAbbr, `${chapter}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as CanonicalChapterRecord;
}

function loadAllCanonicalChapters(): CanonicalChapterRecord[] {
  const chapters: CanonicalChapterRecord[] = [];
  for (const book of BOOKS) {
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      chapters.push(loadChapterJson(book.abbr, chapter));
    }
  }
  return chapters;
}

describe("canonical CSB Bible audit (local bundles)", () => {
  it("has every expected chapter JSON on disk", () => {
    let found = 0;
    for (const book of BOOKS) {
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        const filePath = path.join(CHAPTERS_DIR, book.abbr, `${chapter}.json`);
        expect(fs.existsSync(filePath), `${book.abbr} ${chapter}`).toBe(true);
        found += 1;
      }
    }
    expect(found).toBe(expectedChapterCount());
    expect(found).toBe(1189);
  });

  it(
    "every verse has intact text, matching parts, and full render output",
    () => {
      const audits = loadAllCanonicalChapters().map((record) => auditCanonicalChapter(record));
      const summary = mergeChapterAudits(audits);

      if (summary.issueCount > 0) {
        const preview = summary.issues
          .slice(0, 40)
          .map(
            (issue) =>
              `${issue.bookAbbr} ${issue.chapter}:${issue.verse} [${issue.kind}] ${issue.detail}`,
          )
          .join("\n");
        expect(summary.issues, `${summary.issueCount} issues\n${preview}`).toEqual([]);
      }

      expect(summary.chaptersAudited).toBe(1189);
      expect(summary.versesAudited).toBeGreaterThan(30000);
    },
    120_000,
  );

  it("2 Timothy 2:25 stores the full word truth", () => {
    const record = loadChapterJson("2Ti", 2);
    const verse = record.verses.find((v) => v.verse === 25);
    expect(verse?.text).toContain("the knowledge of the truth.");
    const audit = auditCanonicalChapter(record);
    expect(audit.issues.filter((i) => i.verse === 25)).toEqual([]);
  });
});
