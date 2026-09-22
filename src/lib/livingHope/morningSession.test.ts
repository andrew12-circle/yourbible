import { describe, expect, it } from "vitest";
import { morningNextLabel, morningStepProgress } from "./morningSession";
import { buildExpressRitualSteps } from "./morningRitual";
import { morningReadingChapters } from "./morningReading";
import { BOOKS } from "@/data/books";
import type { MorningScripture } from "@/hooks/useMorningScripture";
import { mergeMorningSectionEdit, readMorningSection } from "./morningSectionEdit";

describe("Morning session navigation", () => {
  const steps = buildExpressRitualSteps();
  it("names the next action without countdowns", () => {
    expect(morningNextLabel(steps, 0)).toBe("Begin with worship");
    expect(morningNextLabel(steps, 2)).toBe("Continue to Scripture");
    expect(morningNextLabel(steps, steps.length - 2)).toBe("Complete my morning");
  });
  it("does not count intro or completion as spiritual activities", () => {
    expect(morningStepProgress(steps, 0)).toMatchObject({ position: 0, total: 5 });
    expect(morningStepProgress(steps, 1)).toMatchObject({ position: 1, total: 5 });
    expect(morningStepProgress(steps, 6)).toMatchObject({ position: 5, total: 5 });
  });
});

describe("Verified morning reference resolution", () => {
  const daily = (reference: string): MorningScripture => ({ source: "daily", reference, readerHref: "/read/Jhn/1" });
  it.each([["John 14", "Jhn", 14], ["John 14:1-6", "Jhn", 14], ["1 John 2:1", "1Jn", 2], ["Psalm 23", "Psa", 23], ["Ps. 23", "Psa", 23]])("resolves %s without falling back to chapter one", (reference, book, chapter) => {
    expect(morningReadingChapters(daily(reference), BOOKS)).toEqual([{ book, chapter, label: expect.any(String) }]);
  });
  it("preserves all chapters in ranges", () => {
    expect(morningReadingChapters(daily("John 14:1–16:4"), BOOKS).map((v) => v.chapter)).toEqual([14, 15, 16]);
    expect(morningReadingChapters(daily("John 14-15"), BOOKS).map((v) => v.chapter)).toEqual([14, 15]);
  });
  it.each(["Unknown 1", "John 99", "John 2-1", "John 3:0", "John 3:10-1", "John", "John 3; Romans 5", "John 0"])("does not guess a replacement for %s", (reference) => {
    expect(() => morningReadingChapters(daily(reference), BOOKS)).toThrow();
  });
  it("uses explicit reading-plan chapters, not the abbreviated display reference", () => {
    const scripture = { source: "reading-plan", reference: "Today's plan", readerHref: "/read/Jhn/1", planDay: { readings: [{ book: "Gen", chapter: 20 }, { book: "Jhn", chapter: 7 }] } } as MorningScripture;
    expect(morningReadingChapters(scripture, BOOKS).map((v) => [v.book, v.chapter])).toEqual([["Gen", 20], ["Jhn", 7]]);
  });
});

describe("Morning text and recording coexistence", () => {
  const heading = "## What's on my heart";
  it("keeps unrelated media, gratitude, listening and completed review", () => {
    const body = `## Worship\n\nSong\n\n${heading}\n\nOld words\n\n## Listening\n\nA thought\n\n<!-- morning-formula-review:start -->\nSummary\n![clip](video://one)`;
    const next = mergeMorningSectionEdit(body, heading, "Old words", "New words").body;
    expect(next).toContain("New words"); expect(next).toContain("A thought"); expect(next).toContain("![clip](video://one)");
    expect(readMorningSection(next, "## Listening")).toBe("A thought");
  });
  it("does not erase a newly appended transcript while changing an earlier sentence", () => {
    const remote = `${heading}\n\nMy old words.\n\nA video transcript.\n\n## Listening\n\nListen`;
    const next = mergeMorningSectionEdit(remote, heading, "My old words.", "My new words.");
    expect(next.text).toContain("My new words."); expect(next.text).toContain("A video transcript.");
  });
  it("fails safely instead of guessing on conflicting prose", () => {
    expect(() => mergeMorningSectionEdit(`${heading}\n\nDifferent thoughts`, heading, "Original words", "Edited thoughts")).toThrow(/kept/);
  });
});
