import { describe, expect, it } from "vitest";
import {
  illuminationBodyStart,
  nextParagraphIllumination,
  splitIlluminationLetter,
} from "./scriptureIllumination";

describe("splitIlluminationLetter", () => {
  it("splits a plain opening letter", () => {
    expect(splitIlluminationLetter("The Lord said")).toEqual({
      prefix: "",
      letter: "T",
      rest: "he Lord said",
    });
  });

  it("skips leading quote before the cap letter", () => {
    expect(splitIlluminationLetter('"Go," he said')).toEqual({
      prefix: '"',
      letter: "G",
      rest: 'o," he said',
    });
  });

  it("treats the first non-whitespace character as the cap letter", () => {
    expect(splitIlluminationLetter("  Then")).toEqual({
      prefix: "  ",
      letter: "T",
      rest: "hen",
    });
  });
});

describe("illuminationBodyStart", () => {
  it("offsets past prefix and cap letter", () => {
    expect(illuminationBodyStart('"Then')).toBe(2);
  });
});

describe("nextParagraphIllumination", () => {
  it("prefers section caps after headings", () => {
    const state = { chapterCapUsed: false, chapterCapEligible: true };
    const next = nextParagraphIllumination(state, false, true);
    expect(next.kind).toBe("section");
    expect(next.state.chapterCapUsed).toBe(false);
  });

  it("uses one chapter cap per page", () => {
    let state = { chapterCapUsed: false, chapterCapEligible: true };
    const first = nextParagraphIllumination(state, false, false);
    expect(first.kind).toBe("chapter");
    const second = nextParagraphIllumination(first.state, false, false);
    expect(second.kind).toBeUndefined();
  });
});
