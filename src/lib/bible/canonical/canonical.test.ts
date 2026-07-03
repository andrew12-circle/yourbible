import { describe, expect, it } from "vitest";
import { makeVerseId, parseVerseId, formatVerseReference } from "@/lib/bible/canonical/verseId";
import {
  passageToCanonicalChapter,
  canonicalChapterToPassage,
} from "@/lib/bible/canonical/passageToCanonical";
import type { Passage } from "@/lib/bible/api";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";

describe("canonical verseId", () => {
  it("round-trips verse ids", () => {
    const id = makeVerseId("CSB-id", "Jhn", 3, 16);
    expect(parseVerseId(id)).toEqual({
      bibleId: "CSB-id",
      bookAbbr: "Jhn",
      chapter: 3,
      verse: 16,
    });
  });

  it("formats references", () => {
    expect(formatVerseReference("Jhn", 3, 16)).toMatch(/John 3:16/);
  });
});

describe("passageToCanonicalChapter", () => {
  const passage: Passage = {
    reference: "John 3",
    textRevision: "api-bible-csb-2024",
    paragraphStarts: [1, 16],
    headings: [{ beforeVerse: 16, text: "The Love of God" }],
    poetryBlocks: [],
    verses: [
      { number: 1, text: "First verse." },
      {
        number: 16,
        text: "For God loved the world.",
        parts: [{ kind: "text", text: "For God loved the world." }],
        footnotes: [{ marker: 1, text: "Or this way" }],
      },
    ],
  };

  it("separates text from layout metadata", () => {
    const record = passageToCanonicalChapter(passage, "Jhn", 3, "csb-test");
    expect(record.verses).toHaveLength(2);
    expect(record.verses[0]?.text).toBe("First verse.");
    expect(record.verses[0]?.verseId).toBe("csb-test:Jhn:3:1");
    expect(record.layout.headings[0]?.text).toBe("The Love of God");
    expect(record.layout.studyByVerse?.[0]?.footnotes).toHaveLength(1);
    expect(record.verses[1]?.parts).toBeUndefined();
  });

  it("shims back to Passage for existing reader", () => {
    const record = passageToCanonicalChapter(passage, "Jhn", 3, "csb-test");
    const restored = canonicalChapterToPassage(record);
    expect(restored.verses[1]?.text).toBe("For God loved the world.");
    expect(restored.verses[1]?.footnotes).toHaveLength(1);
    expect(restored.headings).toEqual(passage.headings);
  });

  it("stamps the current parser revision so stale caches self-invalidate", () => {
    const record = passageToCanonicalChapter(passage, "Jhn", 3, "csb-test");
    expect(record.parserRevision).toBe(PASSAGE_PARSER_REVISION);
  });

  it("re-sanitizes stored verse text when shimming back to a Passage", () => {
    const record = passageToCanonicalChapter(passage, "Jhn", 3, "csb-test");
    record.verses[1]!.text = "the Son of God.\u201d\u00a0"; // simulate legacy debris
    const restored = canonicalChapterToPassage(record);
    expect(restored.verses[1]?.text).toBe("the Son of God.\u201d");
  });
});
