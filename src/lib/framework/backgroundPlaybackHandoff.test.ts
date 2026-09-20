import { beforeEach, describe, expect, it } from "vitest";
import { extrapolateBackgroundPlaybackSeconds, mergePlaybackWithBackgroundHandoff, writeBackgroundPlaybackHandoff } from "./backgroundPlaybackHandoff";

describe("background playback handoff", () => {
  beforeEach(() => sessionStorage.clear());
  it("keeps a paused snapshot frozen", () => {
    expect(extrapolateBackgroundPlaybackSeconds({ secondsAtHide: 90, hiddenAtMs: 1000, wasPlaying: false }, 60000)).toBe(90);
  });
  it("does not assume playing continued while the device was suspended", () => {
    expect(extrapolateBackgroundPlaybackSeconds({ secondsAtHide: 100, hiddenAtMs: 1000, wasPlaying: true }, 301000)).toBe(100);
  });
  it("keeps saved position when no handoff exists", () => {
    expect(mergePlaybackWithBackgroundHandoff(42, "missing")).toBe(42);
  });
  it("never jumps ahead of a current local position", () => {
    writeBackgroundPlaybackHandoff("video", { secondsAtHide: 200, hiddenAtMs: Date.now() - 120000, wasPlaying: true });
    expect(mergePlaybackWithBackgroundHandoff(205, "video")).toBe(205);
    expect(mergePlaybackWithBackgroundHandoff(20, "video")).toBe(20);
    expect(mergePlaybackWithBackgroundHandoff(0, "video")).toBe(0);
  });
  it("uses a frozen snapshot only when current progress is invalid", () => {
    writeBackgroundPlaybackHandoff("video", { secondsAtHide: 200, hiddenAtMs: 1, wasPlaying: true });
    expect(mergePlaybackWithBackgroundHandoff(NaN, "video")).toBe(200);
  });
});
