import { describe, expect, it } from "vitest";
import { formatDictatedJournalText, normalizeShoutingCase } from "@/lib/journal/dictationFormatter";

describe("normalizeShoutingCase", () => {
  it("lowercases shouting-case STT output", () => {
    expect(normalizeShoutingCase("SO I WENT TO THE CHURCH AND IT WAS GOOD")).toBe(
      "so i went to the church and it was good",
    );
  });

  it("preserves mixed-case prose", () => {
    const mixed = "So I went to the Church and prayed.";
    expect(normalizeShoutingCase(mixed)).toBe(mixed);
  });

  it("keeps short acronyms in shouting case", () => {
    expect(normalizeShoutingCase("PRAY FOR THE USA AND UK TODAY")).toBe(
      "pray for the USA and UK today",
    );
  });
});

describe("formatDictatedJournalText", () => {
  it("formats all-caps church notes into journal prose", () => {
    const raw = "SO I WENT TO THE CHURCH AND THE SERMON WAS ABOUT PATIENCE";
    const out = formatDictatedJournalText(raw);
    expect(out).toMatch(/^So i went to the church/i);
    expect(out).toMatch(/\.$/);
  });
  it("capitalizes and adds terminal punctuation", () => {
    const raw = "give me patience and understanding";
    const out = formatDictatedJournalText(raw);
    expect(out).toMatch(/^Give me patience/);
    expect(out).toMatch(/\.$/);
  });

  it("strips curse words from dictation", () => {
    const out = formatDictatedJournalText("i was fucking praying about this");
    expect(out).not.toMatch(/fuck/i);
    expect(out).toMatch(/praying/i);
  });

  it("splits long runs at spoken pivots", () => {
    const raw =
      "give me the patience you understanding and wisdom to know what to do in this situation " +
      "and then help me trust you with the outcome because i am worried about money";
    const out = formatDictatedJournalText(raw);
    expect(out).toContain("\n\n");
  });

  it("replaces spoken punctuation commands", () => {
    const raw = "hello world period new paragraph today was good comma really good period";
    const out = formatDictatedJournalText(raw);
    expect(out).toContain("Hello world.");
    expect(out).toContain("\n\n");
    expect(out).toContain("really good.");
  });

  it("handles question mark command", () => {
    const raw = "what should i do question mark";
    const out = formatDictatedJournalText(raw);
    expect(out).toMatch(/\?/);
  });

  it("breaks long monologues into paragraphs", () => {
    const raw =
      "today i woke up feeling tired but grateful for another day. " +
      "i spent time in prayer asking for wisdom about my work situation. " +
      "then i went for a walk and noticed the trees starting to bloom. " +
      "it reminded me that seasons change and this difficulty will pass too. " +
      "i want to trust god more even when i cannot see the path ahead.";
    const out = formatDictatedJournalText(raw);
    expect(out).toContain("\n\n");
  });
});
