import { describe, expect, it } from "vitest";
import { mergeVerseEntries, versePlainText } from "@/lib/bible/verseParts";
import { poetryLevelForVerse } from "@/lib/bible/parsePassageHtml";

describe("verseParts", () => {
  it("merges parts and rebuilds plain text", () => {
    const a = {
      number: 1,
      text: "Hello",
      parts: [{ kind: "text" as const, text: "Hello" }],
    };
    const b = {
      number: 1,
      text: " world",
      parts: [{ kind: "text" as const, text: " world" }],
    };
    const merged = mergeVerseEntries(a, b);
    expect(versePlainText(merged)).toBe("Hello world");
  });
});

describe("poetryLevelForVerse", () => {
  it("returns the level of the latest poetry block at or before the verse", () => {
    const blocks = [
      { beforeVerse: 1, level: 1 },
      { beforeVerse: 4, level: 2 },
    ];
    expect(poetryLevelForVerse(blocks, 2)).toBe(1);
    expect(poetryLevelForVerse(blocks, 4)).toBe(2);
    expect(poetryLevelForVerse(blocks, 6)).toBe(2);
  });
});
