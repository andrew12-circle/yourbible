import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  clearMorningScriptureTimer,
  getMorningScriptureElapsedMs,
  pauseMorningScriptureTimer,
  startMorningScriptureTimer,
} from "@/lib/livingHope/morningScriptureTimer";

describe("morningScriptureTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMorningScriptureTimer();
    localStorage.clear();
  });

  it("accumulates elapsed time while running", () => {
    startMorningScriptureTimer();
    vi.advanceTimersByTime(60_000);
    expect(getMorningScriptureElapsedMs()).toBeGreaterThanOrEqual(60_000);
    pauseMorningScriptureTimer();
    const paused = getMorningScriptureElapsedMs();
    vi.advanceTimersByTime(30_000);
    expect(getMorningScriptureElapsedMs()).toBe(paused);
  });

  it("resumes after pause", () => {
    startMorningScriptureTimer();
    vi.advanceTimersByTime(30_000);
    pauseMorningScriptureTimer();
    startMorningScriptureTimer();
    vi.advanceTimersByTime(30_000);
    expect(getMorningScriptureElapsedMs()).toBeGreaterThanOrEqual(60_000);
  });
});
