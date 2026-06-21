import { describe, expect, it } from "vitest";
import {
  findVersesWithStudyDebris,
  verseHasStudyDebris,
} from "@/lib/bible/studyParseQuality";

describe("studyParseQuality", () => {
  it("flags leaked cross-ref citations in verse text", () => {
    expect(verseHasStudyDebris("Text Mt 12:41 more")).toBe(true);
    expect(verseHasStudyDebris("In the beginning was the Word.")).toBe(false);
  });

  it("flags Lit footnote debris", () => {
    expect(verseHasStudyDebris("born again Lit That man")).toBe(true);
  });

  it("returns verses with debris", () => {
    const bad = findVersesWithStudyDebris([
      { number: 1, text: "Good verse." },
      { number: 2, text: "Bad Mt 1:1" },
    ]);
    expect(bad.map((v) => v.number)).toEqual([2]);
  });
});
