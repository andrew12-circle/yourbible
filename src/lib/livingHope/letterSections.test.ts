import { describe, expect, it } from "vitest";
import {
  computeUnlockAt,
  defaultLetterTitle,
  isLetterUnlockable,
} from "@/lib/livingHope/letterSections";

describe("livingHope letterSections", () => {
  it("defaultLetterTitle uses year count", () => {
    expect(defaultLetterTitle(1)).toBe("Letter to myself in 1 year");
    expect(defaultLetterTitle(2)).toBe("Letter to myself in 2 years");
    expect(defaultLetterTitle(5)).toBe("Letter to myself in 5 years");
  });

  it("computeUnlockAt adds years", () => {
    const sealed = new Date("2026-06-10T08:00:00Z");
    const unlock = computeUnlockAt(sealed, 2);
    expect(unlock.getFullYear()).toBe(2028);
  });

  it("isLetterUnlockable respects unlock_at", () => {
    expect(isLetterUnlockable(null)).toBe(false);
    expect(isLetterUnlockable("2030-01-01", new Date("2026-01-01"))).toBe(false);
    expect(isLetterUnlockable("2025-01-01", new Date("2026-01-01"))).toBe(true);
  });
});
