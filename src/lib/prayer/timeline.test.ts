import { describe, expect, it } from "vitest";
import { inferTimelineKindFromJournal, timelineKindForJournalEntry } from "@/lib/prayer/timeline";

describe("timelineKindForJournalEntry", () => {
  it("maps entry kinds", () => {
    expect(timelineKindForJournalEntry("dream")).toBe("dream");
    expect(timelineKindForJournalEntry("morning_conversation")).toBe("worship");
    expect(timelineKindForJournalEntry("praise_report")).toBe("gratitude");
    expect(timelineKindForJournalEntry(null)).toBe("journal");
  });
});

describe("inferTimelineKindFromJournal", () => {
  it("delegates to timelineKindForJournalEntry", () => {
    expect(inferTimelineKindFromJournal("dream")).toBe("dream");
  });
});
