import { describe, expect, it } from "vitest";
import { emptyWorshipPrayerTimer, parseWorshipPrayerTimer, pauseWorshipPrayer, startWorshipPrayer, startRemainingWorshipPrayer, worshipPrayerRemaining } from "./morningWorshipPrayer";
import { emptyMorningFoundationSession, formatMorningFoundationJournal, parseMorningFoundationSession } from "./morningFoundation";
const now = 1_800_000_000_000;
describe("prayer within Worship", () => {
  it("defaults to five minutes but never silently extends or shortens the worship budget", () => {
    const timer = emptyWorshipPrayerTimer();
    expect(timer.targetMs).toBe(300_000);
    expect(startWorshipPrayer(timer, 120_000, now).startedAt).toBeNull();
    expect(startWorshipPrayer(timer, 400_000, now).startedAt).toBe(now);
  });
  it("pauses and resumes elapsed time instead of restarting five minutes", () => {
    const first = startWorshipPrayer(emptyWorshipPrayerTimer(), 400_000, now);
    const paused = pauseWorshipPrayer(first, now + 60_000);
    expect(paused.remainingMs).toBe(240_000);
    expect(worshipPrayerRemaining(paused, now + 180_000)).toBe(240_000);
    const resumed = startWorshipPrayer(paused, 250_000, now + 180_000);
    expect(worshipPrayerRemaining(resumed, now + 240_000)).toBe(180_000);
  });
  it("requires an explicit choice to use a shorter remainder", () => {
    const timer = startRemainingWorshipPrayer(emptyWorshipPrayerTimer(), 100_900, now);
    expect(timer.targetMs).toBe(100_000);
    expect(timer.startedAt).toBe(now);
    expect(timer.prayedToday).toBe(false);
  });
  it("does not infer prayer completion from the clock", () => {
    const elapsed = pauseWorshipPrayer(startWorshipPrayer(emptyWorshipPrayerTimer(), 300_000, now), now + 300_000);
    expect(elapsed.remainingMs).toBe(0);
    expect(elapsed.prayedToday).toBe(false);
  });
  it("normalizes malformed state and preserves daily spoken-prayer check-ins", () => {
    expect(parseWorshipPrayerTimer({ targetMs: -4, remainingMs: Infinity, startedAt: "bad" })).toMatchObject({ targetMs: 0, remainingMs: 0, startedAt: null });
    const day = parseMorningFoundationSession({ ...emptyMorningFoundationSession(), worshipMode: "tongues", worshipPrayer: { ...emptyWorshipPrayerTimer(), prayedToday: true }, angelPrayer: "My own words", angelsPrayed: true });
    expect(day.angelPrayer).toBe("My own words");
    expect(formatMorningFoundationJournal(day)).toContain("My check-in");
    expect(formatMorningFoundationJournal(day)).toContain("spoke my angels and protection prayer aloud");
  });
});
