export type PlaybackSnapshot = { seconds: number; updatedAt: number };
export function normalizePlaybackSeconds(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}
/** Resume follows the latest intent, not the furthest point ever watched. */
export function mergePlaybackSnapshots(local: PlaybackSnapshot | null, remote: PlaybackSnapshot | null): PlaybackSnapshot | null {
  if (!local) return remote;
  if (!remote) return local;
  return local.updatedAt >= remote.updatedAt ? local : remote;
}
/** Legacy callers do not have timestamps: prefer their current local intent. */
export function mergePlaybackSeconds(local: number | null | undefined, remote: number | null | undefined): number {
  return normalizePlaybackSeconds(local) ?? normalizePlaybackSeconds(remote) ?? 0;
}
const key = (artifactId: string, userId?: string) => `yb_playback_v2:${userId ?? "anonymous"}:${artifactId}`;
export function readPlaybackSnapshot(artifactId: string, userId?: string): PlaybackSnapshot | null {
  try {
    const raw = localStorage.getItem(key(artifactId, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlaybackSnapshot>;
    const seconds = normalizePlaybackSeconds(parsed.seconds);
    if (seconds == null || typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt) || parsed.updatedAt < 0) return null;
    return { seconds, updatedAt: parsed.updatedAt };
  } catch { return null; }
}
export function writePlaybackSnapshot(artifactId: string, snapshot: PlaybackSnapshot, userId?: string): void {
  if (normalizePlaybackSeconds(snapshot.seconds) == null || !Number.isFinite(snapshot.updatedAt)) return;
  try { localStorage.setItem(key(artifactId, userId), JSON.stringify(snapshot)); } catch { /* Private/full storage: keep the in-memory session usable. */ }
}
