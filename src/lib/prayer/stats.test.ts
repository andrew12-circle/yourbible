import { describe, expect, it } from "vitest";
import {
  computePrayerStats,
  computeWaitDays,
  humanizeWaitDays,
  filterRequestsByPeriod,
} from "@/lib/prayer/stats";
import type { PrayerRequestRow } from "@/lib/prayer/types";

function mockRequest(
  partial: Partial<PrayerRequestRow> & Pick<PrayerRequestRow, "status">,
): PrayerRequestRow {
  return {
    id: "1",
    user_id: "u",
    title: "Test",
    prayer_text: "",
    category: "guidance",
    requested_at: "2026-01-01",
    answered_at: null,
    answer_text: null,
    private_notes: "",
    scripture_refs: [],
    praise_report_entry_id: null,
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("humanizeWaitDays", () => {
  it("formats short waits", () => {
    expect(humanizeWaitDays(43)).toBe("43 days");
    expect(humanizeWaitDays(1)).toBe("1 day");
  });

  it("formats long waits", () => {
    expect(humanizeWaitDays(365 * 3 + 62)).toBe("3 years, 2 months");
  });
});

describe("computeWaitDays", () => {
  it("counts inclusive calendar days", () => {
    expect(
      computeWaitDays({ requested_at: "2026-07-02", answered_at: "2026-08-14" }),
    ).toBe(43);
  });
});

describe("computePrayerStats", () => {
  it("aggregates counts and wait stats", () => {
    const stats = computePrayerStats([
      mockRequest({ status: "waiting" }),
      mockRequest({ status: "answered", answered_at: "2026-02-01" }),
      mockRequest({ status: "answered", answered_at: "2026-03-11", requested_at: "2026-01-01" }),
      mockRequest({ status: "different_answer", answered_at: "2026-04-01" }),
    ]);
    expect(stats.total).toBe(4);
    expect(stats.waiting).toBe(1);
    expect(stats.answered).toBe(2);
    expect(stats.differentAnswer).toBe(1);
    expect(stats.averageWaitDays).toBeGreaterThan(0);
  });
});

describe("filterRequestsByPeriod", () => {
  it("filters by month", () => {
    const now = new Date("2026-07-15T12:00:00");
    const filtered = filterRequestsByPeriod(
      [
        mockRequest({ status: "answered", answered_at: "2026-07-10" }),
        mockRequest({ status: "waiting", requested_at: "2026-06-01" }),
      ],
      "month",
      now,
    );
    expect(filtered).toHaveLength(1);
  });
});
