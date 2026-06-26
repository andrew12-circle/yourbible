import { describe, expect, it } from "vitest";
import {
  buildLifeWeekReviewJournalContent,
  formatLifeWeekReviewTitle,
  lifeWeekReviewTag,
} from "@/lib/lifeWeekReviewJournal";

describe("lifeWeekReviewJournal", () => {
  it("builds markdown with prompt and reflection", () => {
    const { body, summary } = buildLifeWeekReviewJournalContent({
      subject: "self",
      personName: "Andrew",
      weekIndex: 99,
      weekNumber: 100,
      weekRangeLabel: "Jun 16 – Jun 22, 2026",
      weekStart: "2026-06-16",
      reflection: "I spent time with family and prayed each morning.",
    });
    expect(body).toContain("### Reflection");
    expect(body).toContain("I spent time with family");
    expect(summary).toContain("family");
  });

  it("formats family titles", () => {
    expect(
      formatLifeWeekReviewTitle({
        subject: "lilly",
        personName: "Lilly",
        weekRangeLabel: "Jun 16 – Jun 22, 2026",
      }),
    ).toContain("Lilly");
  });

  it("uses stable tags per subject and week", () => {
    expect(lifeWeekReviewTag("caroline", 12)).toBe("lw-review:caroline:12");
  });
});
