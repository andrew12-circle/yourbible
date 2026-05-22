import { describe, expect, it } from "vitest";
import { mergePlaybackSeconds, normalizePlaybackSeconds } from "./artifactPlaybackProgress";

describe("artifactPlaybackProgress", () => {
  it("mergePlaybackSeconds picks the furthest position", () => {
    expect(mergePlaybackSeconds(120, 300)).toBe(300);
    expect(mergePlaybackSeconds(400, 100)).toBe(400);
    expect(mergePlaybackSeconds(null, 50)).toBe(50);
    expect(mergePlaybackSeconds(10, null)).toBe(10);
  });

  it("normalizePlaybackSeconds floors and rejects invalid", () => {
    expect(normalizePlaybackSeconds(12.9)).toBe(12);
    expect(normalizePlaybackSeconds(-1)).toBeNull();
    expect(normalizePlaybackSeconds("nope")).toBeNull();
  });
});
