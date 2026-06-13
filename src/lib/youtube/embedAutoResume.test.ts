import { describe, expect, it } from "vitest";
import {
  canSendEmbedAutoResume,
  EMBED_AUTO_RESUME_MIN_GAP_MS,
  shouldAutoResumeAfterEmbedPause,
} from "./embedAutoResume";

describe("embedAutoResume", () => {
  it("throttles repeat resume commands", () => {
    const t0 = 1_000_000;
    expect(canSendEmbedAutoResume(0, t0)).toBe(true);
    expect(canSendEmbedAutoResume(t0, t0 + EMBED_AUTO_RESUME_MIN_GAP_MS - 1)).toBe(false);
    expect(canSendEmbedAutoResume(t0, t0 + EMBED_AUTO_RESUME_MIN_GAP_MS)).toBe(true);
  });

  it("does not auto-resume after user pointer pause", () => {
    expect(
      shouldAutoResumeAfterEmbedPause({
        intendedPlaying: true,
        msSinceAppPause: 5000,
        recentPlayerPointer: true,
      }),
    ).toBe(false);
  });

  it("auto-resumes spurious pauses while playback was intended", () => {
    expect(
      shouldAutoResumeAfterEmbedPause({
        intendedPlaying: true,
        msSinceAppPause: 5000,
        recentPlayerPointer: false,
      }),
    ).toBe(true);
  });
});
