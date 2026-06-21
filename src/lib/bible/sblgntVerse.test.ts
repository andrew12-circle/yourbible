import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("SBLGNT bundles", () => {
  it("John 1:1 has Greek words with Strong's on λόγος", () => {
    const file = path.join(process.cwd(), "public", "greek", "sblgnt", "Jhn.json");
    const book = JSON.parse(readFileSync(file, "utf8")) as {
      chapters: { chapter: number; verses: { number: number; words: { word: string; strongs?: string }[] }[] }[];
    };
    const ch1 = book.chapters.find((c) => c.chapter === 1);
    const v1 = ch1?.verses.find((v) => v.number === 1);
    expect(v1?.words.some((w) => w.word.includes("λόγος") && w.strongs === "G3056")).toBe(true);
  });
});
