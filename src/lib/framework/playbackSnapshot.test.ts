import { describe, it, expect, afterEach } from "vitest";
import { latestPlaybackSnapshot, readPlaybackSnapshot, writePlaybackSnapshot, parsePlaybackSnapshot } from "./playbackSnapshot";
afterEach(() => sessionStorage.clear());
describe("resume snapshots", () => {
  it("preserves a newer rewind over an older furthest position", () => {
    expect(latestPlaybackSnapshot({ seconds: 20, updatedAt: 200 }, { seconds: 600, updatedAt: 100 })?.seconds).toBe(20);
    expect(latestPlaybackSnapshot({ seconds: 600, updatedAt: 100 }, { seconds: 0, updatedAt: 200 })?.seconds).toBe(0);
  });
  it("scopes cached progress by account and artifact", () => {
    writePlaybackSnapshot("user-a", "video-a", { seconds: 25, updatedAt: 1000 });
    expect(readPlaybackSnapshot("user-b", "video-a")).toBeNull();
    expect(readPlaybackSnapshot("user-a", "video-b")).toBeNull();
    expect(readPlaybackSnapshot("user-a", "video-a")?.seconds).toBe(25);
  });
  it("rejects invalid snapshots", () => {
    expect(parsePlaybackSnapshot({ seconds: -1, updatedAt: 1000 })).toBeNull();
    expect(parsePlaybackSnapshot({ seconds: 10, updatedAt: "bad" })).toBeNull();
  });
});
