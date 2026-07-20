import type { HomeDashboardCounts } from "@/lib/home/homeApps";

export const HOME_DASHBOARD_SNAPSHOT_VERSION = 1;
export const HOME_DASHBOARD_SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type HomeDashboardPromptSnapshot = {
  id: string;
  text: string;
};

export type HomeDashboardSnapshot = {
  version: typeof HOME_DASHBOARD_SNAPSHOT_VERSION;
  userId: string;
  savedAt: number;
  dateKey: string;
  counts: HomeDashboardCounts;
  todayPrompt: HomeDashboardPromptSnapshot | null;
  onThisDayCount: number;
  displayName: string;
  wallpaper: string | null;
  wallpaperTint: number;
  wallpaperBlur: number;
  profilePhoto: string | null;
};

const EMPTY_COUNTS: HomeDashboardCounts = {
  beliefs: 0,
  tensions: 0,
  chats: 0,
  artifacts: 0,
  journalToday: 0,
  prayerWaiting: 0,
};

export function homeDashboardSnapshotStorageKey(userId: string): string {
  return `yb.home.dashboardSnapshot.v${HOME_DASHBOARD_SNAPSHOT_VERSION}.${userId}`;
}

export function buildHomeDashboardDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function createHomeDashboardSnapshot(
  input: Omit<HomeDashboardSnapshot, "version" | "savedAt" | "dateKey"> & {
    savedAt?: number;
    date?: Date;
  },
): HomeDashboardSnapshot {
  return {
    version: HOME_DASHBOARD_SNAPSHOT_VERSION,
    userId: input.userId,
    savedAt: input.savedAt ?? Date.now(),
    dateKey: buildHomeDashboardDateKey(input.date),
    counts: normalizeCounts(input.counts),
    todayPrompt: normalizePrompt(input.todayPrompt),
    onThisDayCount: normalizeNonNegativeInteger(input.onThisDayCount),
    displayName: input.displayName.trim(),
    wallpaper: normalizeNullableString(input.wallpaper),
    wallpaperTint: clampPercent(input.wallpaperTint),
    wallpaperBlur: clampBlur(input.wallpaperBlur),
    profilePhoto: normalizeNullableString(input.profilePhoto),
  };
}

export function readHomeDashboardSnapshot(
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string,
  now = Date.now(),
): HomeDashboardSnapshot | null {
  const key = homeDashboardSnapshotStorageKey(userId);
  let raw: string | null = null;

  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const snapshot = JSON.parse(raw) as HomeDashboardSnapshot;
    if (!isValidHomeDashboardSnapshot(snapshot, userId, now)) {
      storage.removeItem(key);
      return null;
    }
    return snapshot;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function saveHomeDashboardSnapshot(
  storage: Pick<Storage, "setItem">,
  snapshot: HomeDashboardSnapshot,
): boolean {
  if (!isValidHomeDashboardSnapshot(snapshot, snapshot.userId, Date.now())) return false;

  try {
    storage.setItem(homeDashboardSnapshotStorageKey(snapshot.userId), JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

function isValidHomeDashboardSnapshot(
  snapshot: HomeDashboardSnapshot,
  userId: string,
  now: number,
): snapshot is HomeDashboardSnapshot {
  return (
    snapshot != null &&
    snapshot.version === HOME_DASHBOARD_SNAPSHOT_VERSION &&
    snapshot.userId === userId &&
    Number.isFinite(snapshot.savedAt) &&
    now - snapshot.savedAt <= HOME_DASHBOARD_SNAPSHOT_MAX_AGE_MS &&
    typeof snapshot.dateKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(snapshot.dateKey) &&
    isCounts(snapshot.counts) &&
    (snapshot.todayPrompt == null ||
      (typeof snapshot.todayPrompt.id === "string" && typeof snapshot.todayPrompt.text === "string")) &&
    Number.isFinite(snapshot.onThisDayCount) &&
    typeof snapshot.displayName === "string" &&
    (snapshot.wallpaper == null || typeof snapshot.wallpaper === "string") &&
    Number.isFinite(snapshot.wallpaperTint) &&
    Number.isFinite(snapshot.wallpaperBlur) &&
    (snapshot.profilePhoto == null || typeof snapshot.profilePhoto === "string")
  );
}

function normalizeCounts(counts: HomeDashboardCounts): HomeDashboardCounts {
  return {
    beliefs: normalizeNonNegativeInteger(counts.beliefs),
    tensions: normalizeNonNegativeInteger(counts.tensions),
    chats: normalizeNonNegativeInteger(counts.chats),
    artifacts: normalizeNonNegativeInteger(counts.artifacts),
    journalToday: normalizeNonNegativeInteger(counts.journalToday),
    prayerWaiting: normalizeNonNegativeInteger(counts.prayerWaiting),
  };
}

function isCounts(value: HomeDashboardCounts): value is HomeDashboardCounts {
  return (
    value != null &&
    Object.keys(EMPTY_COUNTS).every((key) =>
      Number.isFinite(value[key as keyof HomeDashboardCounts]),
    )
  );
}

function normalizePrompt(prompt: HomeDashboardPromptSnapshot | null): HomeDashboardPromptSnapshot | null {
  if (!prompt?.id || !prompt.text) return null;
  return { id: prompt.id, text: prompt.text };
}

function normalizeNullableString(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 24;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampBlur(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(40, Math.max(0, Math.round(value)));
}
