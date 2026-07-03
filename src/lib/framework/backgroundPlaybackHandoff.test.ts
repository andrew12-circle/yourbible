import { describe, expect, it } from "vitest";
import {
  extrapolateBackgroundPlaybackSeconds,
  mergePlaybackWithBackgroundHandoff,
  type BackgroundPlaybackHandoff,
} from "./backgroundPlaybackHandoff";

describe("extrapolateBackgroundPlaybackSeconds", () => {
  it("returns frozen position when not playing", () => {
    const handoff: BackgroundPlaybackHandoff = {
      hiddenAtMs: 1_000,
      secondsAtHide: 90,
      wasPlaying: false,
    };
    expect(extrapolateBackgroundPlaybackSeconds(handoff, 61_000)).toBe(90);
  });

  it("adds elapsed wall time while playing in a background tab", () => {
    const handoff: BackgroundPlaybackHandoff = {
      hiddenAtMs: 1_000,
      secondsAtHide: 100,
      wasPlaying: true,
    };
    expect(extrapolateBackgroundPlaybackSeconds(handoff, 31_000)).toBe(130);
  });
});

describe("mergePlaybackWithBackgroundHandoff", () => {
  it("returns saved seconds when no handoff exists", () => {
    expect(mergePlaybackWithBackgroundHandoff(42, "missing-artifact")).toBe(42);
  });

  it("prefers extrapolated progress over stale saved seconds", () => {
    const artifactId = "artifact-handoff-test";
    sessionStorage.setItem(
      "yb_artifact_playback_handoff_v1:artifact-handoff-test",
      JSON.stringify({
        hiddenAtMs: Date.now() - 120_000,
        secondsAtHide: 200,
        wasPlaying: true,
      }),
    );
    expect(mergePlaybackWithBackgroundHandoff(205, artifactId)).toBeGreaterThanOrEqual(318);
    sessionStorage.removeItem("yb_artifact_playback_handoff_v1:artifact-handoff-test");
  });
});
