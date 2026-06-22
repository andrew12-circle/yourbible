import { describe, expect, it } from "vitest";
import { formatDictatedJournalText } from "@/lib/journal/dictationFormatter";

describe("formatDictatedJournalText", () => {
  it("capitalizes and adds terminal punctuation", () => {
    const raw = "give me patience and understanding";
    const out = formatDictatedJournalText(raw);
    expect(out).toMatch(/^Give me patience/);
    expect(out).toMatch(/\.$/);
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
});
