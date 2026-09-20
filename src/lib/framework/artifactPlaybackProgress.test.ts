import { beforeEach, describe, expect, it } from "vitest";
import { mergePlaybackSeconds, normalizePlaybackSeconds } from "./artifactPlaybackProgress";
import { mergePlaybackSnapshots, readPlaybackSnapshot, writePlaybackSnapshot } from "./playbackSnapshot";

describe("artifactPlaybackProgress", () => {
  beforeEach(() => localStorage.clear());
  it("prefers current local intent when legacy callers lack timestamps", () => {
    expect(mergePlaybackSeconds(120, 300)).toBe(120);
    expect(mergePlaybackSeconds(0, 900)).toBe(0);
    expect(mergePlaybackSeconds(400, 100)).toBe(400);
    expect(mergePlaybackSeconds(null, 50)).toBe(50);
    expect(mergePlaybackSeconds(10, null)).toBe(10);
  });
  it("uses timestamps, not furthest position, for account progress", () => {
    expect(mergePlaybackSnapshots({ seconds: 20, updatedAt: 200 }, { seconds: 800, updatedAt: 100 })?.seconds).toBe(20);
    expect(mergePlaybackSnapshots({ seconds: 800, updatedAt: 100 }, { seconds: 0, updatedAt: 300 })?.seconds).toBe(0);
  });
  it("keeps account caches separate and does not leak anonymous progress", () => {
    writePlaybackSnapshot("video", { seconds: 90, updatedAt: 1 }, "alice");
    writePlaybackSnapshot("video", { seconds: 40, updatedAt: 2 });
    expect(readPlaybackSnapshot("video", "alice")?.seconds).toBe(90);
    expect(readPlaybackSnapshot("video", "bob")).toBeNull();
    expect(readPlaybackSnapshot("video")?.seconds).toBe(40);
  });
  it("floors seconds and rejects invalid progress", () => {
    expect(normalizePlaybackSeconds(12.9)).toBe(12);
    expect(normalizePlaybackSeconds(-1)).toBeNull();
    expect(normalizePlaybackSeconds("nope")).toBeNull();
    expect(normalizePlaybackSeconds(Infinity)).toBeNull();
  });
});
