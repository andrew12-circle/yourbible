import { describe, expect, it, afterEach } from "vitest";
import { extrapolateBackgroundPlaybackSeconds, mergePlaybackWithBackgroundHandoff, writeBackgroundPlaybackHandoff } from "./backgroundPlaybackHandoff";
afterEach(() => sessionStorage.clear());
describe("background position integrity", () => {
  it("never advances a suspended player's position from wall-clock time", () => {
    expect(extrapolateBackgroundPlaybackSeconds({ hiddenAtMs: 1000, secondsAtHide: 1200, wasPlaying: true }, 301000)).toBe(1200);
  });
  it("preserves paused positions", () => {
    expect(extrapolateBackgroundPlaybackSeconds({ hiddenAtMs: 1000, secondsAtHide: 90, wasPlaying: false }, 61000)).toBe(90);
  });
  it("does not override an intentional rewind with a stale handoff", () => {
    writeBackgroundPlaybackHandoff("a", { hiddenAtMs: Date.now() - 120000, secondsAtHide: 200, wasPlaying: true });
    expect(mergePlaybackWithBackgroundHandoff(50, "a")).toBe(50);
    expect(mergePlaybackWithBackgroundHandoff(0, "a")).toBe(0);
  });
});
