import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { auditChapterHtmlParse, chapterParseIsComplete } from "@/lib/bible/bibleParserAudit";
import { parsePassageHtml } from "@/lib/bible/parsePassageHtml";
import { GOLDEN_CSB_CHAPTERS, goldenFixtureHtmlPath } from "@/lib/bible/goldenChapters";

describe("golden CSB fixtures — parser completeness", () => {
  for (const spec of GOLDEN_CSB_CHAPTERS) {
    it(`${spec.reference} has no dropped verseless text`, () => {
      const filePath = path.join(process.cwd(), goldenFixtureHtmlPath(spec.id));
      const html = fs.readFileSync(filePath, "utf8");
      const audit = auditChapterHtmlParse(html);
      expect(audit.verseCount).toBeGreaterThanOrEqual(spec.minVerseCount);
      expect(chapterParseIsComplete(audit)).toBe(true);
    });
  }
});

describe("Micah 6 fixture — key verses restored", () => {
  it("includes full verse 8 (act justly, walk humbly)", () => {
    const filePath = path.join(process.cwd(), goldenFixtureHtmlPath("csb-mic-6"));
    const html = fs.readFileSync(filePath, "utf8");
    const audit = auditChapterHtmlParse(html);
    expect(audit.orphanCharCount).toBe(0);
    const eight = parsePassageHtml(html, "Micah 6").verses.find((v) => v.number === 8);
    expect(eight?.text).toContain("act justly");
    expect(eight?.text).toContain("walk humbly with your God");
  });
});
