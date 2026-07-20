import { describe, expect, it } from "vitest";
import {
  HOME_DASHBOARD_SNAPSHOT_MAX_AGE_MS,
  buildHomeDashboardDateKey,
  createHomeDashboardSnapshot,
  homeDashboardSnapshotStorageKey,
  readHomeDashboardSnapshot,
  saveHomeDashboardSnapshot,
} from "@/lib/home/homeDashboardSnapshot";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

const counts = {
  beliefs: 2,
  tensions: 1,
  chats: 3,
  artifacts: 4,
  journalToday: 0,
  prayerWaiting: 5,
};

describe("homeDashboardSnapshot", () => {
  it("round-trips a valid per-user snapshot", () => {
    const storage = createMemoryStorage();
    const savedAt = Date.now();
    const snapshot = createHomeDashboardSnapshot({
      userId: "user-1",
      counts,
      todayPrompt: { id: "prompt-1", text: "What are you grateful for?" },
      onThisDayCount: 7,
      displayName: " Andrew ",
      wallpaper: " https://example.com/wallpaper.jpg ",
      wallpaperTint: 42,
      wallpaperBlur: 8,
      profilePhoto: "https://example.com/profile.jpg",
      savedAt,
      date: new Date("2026-07-20T12:00:00"),
    });

    expect(saveHomeDashboardSnapshot(storage, snapshot)).toBe(true);

    const read = readHomeDashboardSnapshot(storage, "user-1", savedAt + 100);
    expect(read?.dateKey).toBe("2026-07-20");
    expect(read?.displayName).toBe("Andrew");
    expect(read?.counts.artifacts).toBe(4);
  });

  it("rejects snapshots for another user", () => {
    const storage = createMemoryStorage();
    const snapshot = createHomeDashboardSnapshot({
      userId: "user-1",
      counts,
      todayPrompt: null,
      onThisDayCount: 0,
      displayName: "",
      wallpaper: null,
      wallpaperTint: 24,
      wallpaperBlur: 0,
      profilePhoto: null,
    });

    storage.setItem(homeDashboardSnapshotStorageKey("user-2"), JSON.stringify(snapshot));

    expect(readHomeDashboardSnapshot(storage, "user-2")).toBeNull();
    expect(storage.getItem(homeDashboardSnapshotStorageKey("user-2"))).toBeNull();
  });

  it("expires old snapshots", () => {
    const storage = createMemoryStorage();
    const savedAt = Date.now();
    const snapshot = createHomeDashboardSnapshot({
      userId: "user-1",
      counts,
      todayPrompt: null,
      onThisDayCount: 0,
      displayName: "",
      wallpaper: null,
      wallpaperTint: 24,
      wallpaperBlur: 0,
      profilePhoto: null,
      savedAt,
    });

    saveHomeDashboardSnapshot(storage, snapshot);

    expect(
      readHomeDashboardSnapshot(
        storage,
        "user-1",
        savedAt + HOME_DASHBOARD_SNAPSHOT_MAX_AGE_MS + 1,
      ),
    ).toBeNull();
  });

  it("uses local calendar dates for daily cache keys", () => {
    expect(buildHomeDashboardDateKey(new Date(2026, 6, 5))).toBe("2026-07-05");
  });
});
