import { describe, expect, it } from "vitest";
import { scrubTranscriptProfanity } from "@/lib/journal/scrubTranscriptProfanity";

describe("scrubTranscriptProfanity", () => {
  it("removes strong swears like fucking", () => {
    expect(scrubTranscriptProfanity("I was fucking looking at the verse")).toBe(
      "I was looking at the verse",
    );
  });

  it("is case-insensitive and collapses leftover spaces", () => {
    expect(scrubTranscriptProfanity("What the FUCK is happening")).toBe("What the is happening");
  });

  it("removes common strong curse words", () => {
    expect(scrubTranscriptProfanity("This shit and that asshole")).toBe("This and that");
  });

  it("keeps theological words that are not strong swears", () => {
    expect(scrubTranscriptProfanity("He descended into hell and damned the powers")).toBe(
      "He descended into hell and damned the powers",
    );
  });

  it("leaves clean prose unchanged", () => {
    const clean = "Lord, give me patience and understanding today.";
    expect(scrubTranscriptProfanity(clean)).toBe(clean);
  });

  it("handles empty input", () => {
    expect(scrubTranscriptProfanity("")).toBe("");
  });
});
