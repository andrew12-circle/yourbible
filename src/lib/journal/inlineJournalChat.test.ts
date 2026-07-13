import { describe, expect, it } from "vitest";
import {
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
