import { describe, expect, it } from "vitest";
import { auditChapterHtmlParse, chapterParseIsComplete } from "@/lib/bible/bibleParserAudit";

describe("bibleParserAudit", () => {
  it("reports zero orphan text when poetry continuations are merged", () => {
    const html = `
<p class="m"><span class="v">1</span>Now listen to what the Lord is saying: </p>
<p class="q">Rise, plead your case before the mountains, </p>
<p class="q">and let the hills hear your complaint. </p>`;
    const audit = auditChapterHtmlParse(html);
    expect(audit.orphanCharCount).toBe(0);
    expect(chapterParseIsComplete(audit)).toBe(true);
  });

  it("flags orphan text when continuation lines are not merged", () => {
    const html = `
<p class="q1"><span class="v">1</span>The Lord is my shepherd; </p>
<p class="q">I lack nothing. </p>`;
    // After fix, this should be complete — guards Psalm-style regressions.
    const audit = auditChapterHtmlParse(html);
    expect(audit.orphanCharCount).toBe(0);
    expect(audit.parsedCharCount).toBeGreaterThan(20);
  });
});
