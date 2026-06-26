import { describe, expect, it } from "vitest";
import {
  groupLifeWeekReviews,
  mergeLifeWeekReviewLogEntries,
  type LifeWeekReviewLogEntry,
} from "@/lib/lifeWeekReviewLog";

function entry(
  subject: LifeWeekReviewLogEntry["subject"],
  weekIndex: number,
  completedAt: string,
  reflection = "Reflection text here for testing purposes.",
): LifeWeekReviewLogEntry {
  return {
    id: `${subject}:${weekIndex}`,
    subject,
    week_index: weekIndex,
    week_start: "2026-06-16",
    reflection,
    completed_at: completedAt,
    source: "local",
  };
}

describe("mergeLifeWeekReviewLogEntries", () => {
  it("prefers newer local over remote for same subject and week", () => {
    const remote = [entry("self", 10, "2026-06-20T10:00:00Z", "Remote")];
    const local = [entry("self", 10, "2026-06-21T10:00:00Z", "Local newer")];
    const merged = mergeLifeWeekReviewLogEntries(remote, local);
    expect(merged).toHaveLength(1);
    expect(merged[0].reflection).toBe("Local newer");
  });
});

describe("groupLifeWeekReviews", () => {
  it("clusters close-outs within a few hours", () => {
    const entries = [
      entry("self", 10, "2026-06-20T10:00:00Z"),
      entry("lilly", 40, "2026-06-20T10:30:00Z"),
      entry("caroline", 35, "2026-06-20T11:00:00Z"),
      entry("self", 9, "2026-06-13T10:00:00Z"),
    ];
    const groups = groupLifeWeekReviews(entries);
    expect(groups).toHaveLength(2);
    expect(Object.keys(groups[0].entries)).toHaveLength(3);
    expect(groups[1].entries.self?.week_index).toBe(9);
  });
});
