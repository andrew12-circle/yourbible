import { describe, expect, it } from "vitest";
import {
  embedNeedsResumeSeek,
  resolveEmbedPlaybackSeconds,
  resolvePlaybackSeconds,
} from "./playbackSeconds";

describe("resolvePlaybackSeconds", () => {
  it("returns 0 when telemetry is at start, not stale fallback", () => {
    expect(resolvePlaybackSeconds(0, 42)).toBe(0);
  });

  it("uses fallback when telemetry is null or undefined", () => {
    expect(resolvePlaybackSeconds(null, 42)).toBe(42);
    expect(resolvePlaybackSeconds(undefined, 15)).toBe(15);
  });

  it("returns live telemetry when present", () => {
    expect(resolvePlaybackSeconds(120, 0)).toBe(120);
  });
});

describe("resolveEmbedPlaybackSeconds", () => {
  it("uses fallback when iframe telemetry is stale", () => {
    expect(resolveEmbedPlaybackSeconds(0, 312, false)).toBe(312);
  });

  it("trusts fresh telemetry at 0", () => {
    expect(resolveEmbedPlaybackSeconds(0, 312, true)).toBe(0);
  });

  it("uses fresh telemetry when ahead of fallback", () => {
    expect(resolveEmbedPlaybackSeconds(120.4, 118, true)).toBe(120.4);
  });
});

describe("embedNeedsResumeSeek", () => {
  it("does not seek when live is at or ahead of saved", () => {
    expect(embedNeedsResumeSeek(130, 100, true, true)).toBe(false);
    expect(embedNeedsResumeSeek(100, 100, false, true)).toBe(false);
  });

  it("seeks after iframe reset even when was playing before background", () => {
    expect(embedNeedsResumeSeek(0, 120, false, true)).toBe(true);
  });

  it("does not seek on small drift with stale telemetry while backgrounded", () => {
    expect(embedNeedsResumeSeek(118, 120, false, true)).toBe(false);
  });

  it("seeks when iframe reloaded near start while paused deep in the video", () => {
    expect(embedNeedsResumeSeek(0, 120, false, false)).toBe(true);
  });

  it("seeks when live is meaningfully behind saved", () => {
    expect(embedNeedsResumeSeek(50, 100, true, false)).toBe(true);
    expect(embedNeedsResumeSeek(97, 100, true, false)).toBe(false);
    expect(embedNeedsResumeSeek(100, 120, false, true)).toBe(true);
  });
});
