import { describe, expect, it } from "vitest";
import { buildDocumentBlocks } from "@/lib/bible/documentModel";
import type { ChapterLayout, CanonicalVerse } from "@/lib/bible/canonical/types";

describe("documentModel", () => {
  it("builds heading and paragraph blocks from canonical data", () => {
    const verses: CanonicalVerse[] = [
      {
        verseId: "csb:Jhn:3:1",
        bibleId: "csb",
        bookAbbr: "Jhn",
        bookOrder: 42,
        chapter: 3,
        verse: 1,
        text: "First.",
        textRevision: "api-bible-csb-2024",
      },
      {
        verseId: "csb:Jhn:3:16",
        bibleId: "csb",
        bookAbbr: "Jhn",
        bookOrder: 42,
        chapter: 3,
        verse: 16,
        text: "For God loved the world.",
        textRevision: "api-bible-csb-2024",
      },
    ];
    const layout: ChapterLayout = {
      bibleId: "csb",
      bookAbbr: "Jhn",
      chapter: 3,
      paragraphStarts: [1, 16],
      headings: [{ beforeVerse: 16, text: "The Love of God" }],
      poetryBlocks: [],
    };
    const blocks = buildDocumentBlocks(verses, layout, undefined, "csb");
    expect(blocks.some((b) => b.type === "heading")).toBe(true);
    expect(blocks.filter((b) => b.type === "paragraph")).toHaveLength(2);
  });
});
