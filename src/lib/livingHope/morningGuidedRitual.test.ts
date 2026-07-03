import { describe, expect, it } from "vitest";
import {
  buildGuidedIntroMessage,
  formatGuidedCountdown,
  scriptureReadingComplete,
  worshipPhaseComplete,
  GUIDED_SCRIPTURE_MS,
  GUIDED_WORSHIP_MS,
} from "@/lib/livingHope/morningGuidedRitual";

describe("morningGuidedRitual", () => {
  it("builds a personalized intro with formal name", () => {
    const msg = buildGuidedIntroMessage("Mr. Heisley");
    expect(msg).toContain("Good morning, Mr. Heisley");
    expect(msg).toContain("worship, thanks, scripture");
    expect(msg).toContain("one step at a time");
  });

  it("falls back when name is empty", () => {
    expect(buildGuidedIntroMessage("")).toContain("Good morning, friend");
  });

  it("formats countdown as m:ss", () => {
    expect(formatGuidedCountdown(125_000)).toBe("2:05");
    expect(formatGuidedCountdown(0)).toBe("0:00");
  });

  it("detects worship and scripture phase completion", () => {
    expect(worshipPhaseComplete(GUIDED_WORSHIP_MS - 1)).toBe(false);
    expect(worshipPhaseComplete(GUIDED_WORSHIP_MS)).toBe(true);
    expect(scriptureReadingComplete(GUIDED_SCRIPTURE_MS - 1)).toBe(false);
    expect(scriptureReadingComplete(GUIDED_SCRIPTURE_MS)).toBe(true);
  });
});
