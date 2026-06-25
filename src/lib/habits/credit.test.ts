import { describe, expect, it } from "vitest";
import {
  countsForCredit,
  creditDeadlineForDay,
  isCreditWindowOpen,
  isMissedDay,
} from "@/lib/habits/credit";

describe("habit credit window", () => {
  it("allows credit until 48h after the calendar day ends", () => {
    const deadline = creditDeadlineForDay("2026-06-24");
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(5);
    expect(deadline.getDate()).toBe(27);
    expect(deadline.getHours()).toBe(0);
  });

  it("counts on-time marks for credit", () => {
    expect(countsForCredit("2026-06-24", "2026-06-25T10:00:00")).toBe(true);
  });

  it("rejects late marks for credit", () => {
    expect(countsForCredit("2026-06-24", "2026-06-27T01:00:00")).toBe(false);
  });

  it("treats unmarked days as missed after the window", () => {
    const now = new Date(2026, 5, 27, 12, 0, 0);
    expect(isMissedDay("2026-06-24", false, now)).toBe(true);
    expect(isCreditWindowOpen("2026-06-24", now)).toBe(false);
  });

  it("keeps today open until the window closes", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    expect(isCreditWindowOpen("2026-06-24", now)).toBe(true);
    expect(isMissedDay("2026-06-24", false, now)).toBe(false);
  });
});
