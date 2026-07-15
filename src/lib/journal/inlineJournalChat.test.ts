import { describe, expect, it } from "vitest";
import {
  buildJournalReflectionSeedMessage,
  JOURNAL_REFLECTION_AUTO_OPEN_MESSAGE,
  isJournalReflectionKind,
} from "@/lib/journal/inlineJournalChat";

describe("inlineJournalChat reflection open", () => {
  it("treats non-chat entries as reflection candidates", () => {
    expect(isJournalReflectionKind(null)).toBe(true);
    expect(isJournalReflectionKind(undefined)).toBe(true);
    expect(isJournalReflectionKind("video")).toBe(true);
    expect(isJournalReflectionKind("chat")).toBe(false);
  });

  it("exposes a non-empty auto-open message for older my-ai-chat builds", () => {
    expect(JOURNAL_REFLECTION_AUTO_OPEN_MESSAGE.trim().length).toBeGreaterThan(10);
    expect(JOURNAL_REFLECTION_AUTO_OPEN_MESSAGE.toLowerCase()).toContain("journal");
  });
});

describe("buildJournalReflectionSeedMessage", () => {
  it("uses the full entry body as the opening message", () => {
    const body = "Today was heavy. I keep circling the same worry about work.";
    expect(
      buildJournalReflectionSeedMessage({ title: "Heavy day", summary: "Worried", body }),
    ).toBe(body);
  });

  it("falls back to the summary, then the title, when there is no body", () => {
    expect(
      buildJournalReflectionSeedMessage({ title: "A title", summary: "A summary", body: "  " }),
    ).toBe("A summary");
    expect(
      buildJournalReflectionSeedMessage({ title: "A title", summary: null, body: null }),
    ).toBe("A title");
  });

  it("returns an empty string when the entry has no text", () => {
    expect(buildJournalReflectionSeedMessage(null)).toBe("");
    expect(buildJournalReflectionSeedMessage({ title: "", summary: "", body: "" })).toBe("");
  });
});
