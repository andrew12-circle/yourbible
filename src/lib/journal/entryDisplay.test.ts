import { describe, expect, it } from "vitest";
import {
  entryDisplayTitle,
  entryFallbackTitle,
  extractReadableProse,
  isTextOnlyJournalEntry,
} from "./entryDisplay";

describe("entryDisplay", () => {
  it("extracts sketch transcription prose", () => {
    const body = `<!-- sketch-tx:abc -->\n---\n**From your sketch** (AI transcription)\n\nI felt peace today even though work was hard.`;
    expect(extractReadableProse(body)).toContain("felt peace today");
  });

  it("uses first sentence as fallback title", () => {
    const body = "I should be in freak out mode, but I have a peace about what is to come.";
    expect(entryFallbackTitle(body)).toMatch(/^I should be in freak out mode/);
  });

  it("treats untitled prose entries as text-only", () => {
    const entry = {
      title: null,
      body: "Long journal paragraph about trusting God when everything feels uncertain and loud.",
      photo_url: null,
    };
    expect(isTextOnlyJournalEntry(entry)).toBe(true);
    expect(entryDisplayTitle(entry).length).toBeGreaterThan(10);
  });
});
