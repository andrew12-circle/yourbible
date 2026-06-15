import { describe, expect, it } from "vitest";
import {
  formatAskedQuestionLine,
  mergeAskedQuestionIntoThought,
  SPIRIT_LISTENING_QUESTION_BANK,
} from "@/lib/journal/spiritListeningQuestions";

describe("spiritListeningQuestions", () => {
  it("has non-empty categories with unique ids", () => {
    expect(SPIRIT_LISTENING_QUESTION_BANK.length).toBeGreaterThanOrEqual(7);
    const ids = SPIRIT_LISTENING_QUESTION_BANK.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const cat of SPIRIT_LISTENING_QUESTION_BANK) {
      expect(cat.label.trim().length).toBeGreaterThan(0);
      expect(cat.questions.length).toBeGreaterThan(0);
      for (const q of cat.questions) {
        expect(q.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("formats asked question lines", () => {
    expect(formatAskedQuestionLine("Who are You to me today?")).toBe(
      "Asked: Who are You to me today?",
    );
    expect(formatAskedQuestionLine("  ")).toBe("");
  });

  it("merges asked questions into thought without duplicates", () => {
    const q = "What is the one faithful thing You want from me today?";
    expect(mergeAskedQuestionIntoThought("", q)).toBe(formatAskedQuestionLine(q));
    expect(mergeAskedQuestionIntoThought("Heard: peace.", q)).toBe(
      `${formatAskedQuestionLine(q)}\n\nHeard: peace.`,
    );
    const once = mergeAskedQuestionIntoThought("", q);
    expect(mergeAskedQuestionIntoThought(once, q)).toBe(once);
  });
});
