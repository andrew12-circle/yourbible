import { describe, expect, it } from "vitest";
import {
  assignCrossRefLetters,
  collectHolmanXrefsFromVerses,
  collectPageFootnotes,
  crossRefLetterAt,
  formatHolmanXrefBlockLines,
} from "@/lib/bible/holmanStudyLayout";
import type { PassageVerse } from "@/lib/bible/api";

describe("holmanStudyLayout", () => {
  it("assigns sequential letters to cross-refs", () => {
    const parts = assignCrossRefLetters([
      { kind: "text", text: "Hello" },
      {
        kind: "crossref",
        label: "Ps 37:37",
        book: "Ps",
        chapter: 37,
        verse: 37,
      },
      {
        kind: "crossref",
        label: "Job 1:8",
        book: "Job",
        chapter: 1,
        verse: 8,
      },
    ]);
    expect(parts[1]).toMatchObject({ kind: "crossref", letter: "a" });
    expect(parts[2]).toMatchObject({ kind: "crossref", letter: "b" });
  });

  it("preserves publisher xo letters", () => {
    const parts = assignCrossRefLetters([
      {
        kind: "crossref",
        label: "Mt 1:17",
        book: "Mt",
        chapter: 1,
        verse: 17,
        letter: "c",
      },
    ]);
    expect(parts[0]).toMatchObject({ letter: "c" });
  });

  it("formats column xref blocks Holman-style", () => {
    const verses: PassageVerse[] = [
      {
        number: 1,
        text: "Text",
        parts: [
          { kind: "text", text: "Text" },
          {
            kind: "crossref",
            label: "Ps 37:37",
            book: "Ps",
            chapter: 37,
            verse: 37,
            letter: "a",
          },
          {
            kind: "crossref",
            label: "Job 1:8",
            book: "Job",
            chapter: 1,
            verse: 8,
            letter: "b",
          },
        ],
      },
    ];
    expect(formatHolmanXrefBlockLines(collectHolmanXrefsFromVerses(verses, 1))).toEqual([
      "1:1 a Ps 37:37 b Job 1:8",
    ]);
  });

  it("dedupes page footnotes by marker", () => {
    const verses: PassageVerse[] = [
      {
        number: 1,
        text: "A",
        parts: [
          { kind: "text", text: "A" },
          { kind: "footnote", marker: 1, text: "Lit sons" },
        ],
      },
      {
        number: 2,
        text: "B",
        parts: [
          { kind: "text", text: "B" },
          { kind: "footnote", marker: 1, text: "Lit sons" },
          { kind: "footnote", marker: 2, text: "Or upright" },
        ],
      },
    ];
    expect(collectPageFootnotes(verses)).toEqual([
      { marker: 1, text: "Lit sons" },
      { marker: 2, text: "Or upright" },
    ]);
  });

  it("wraps letters after z", () => {
    expect(crossRefLetterAt(25)).toBe("z");
    expect(crossRefLetterAt(26)).toBe("a1");
  });
});
