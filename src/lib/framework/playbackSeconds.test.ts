import { describe, expect, it } from "vitest";
import { resolvePlaybackSeconds } from "./playbackSeconds";

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
