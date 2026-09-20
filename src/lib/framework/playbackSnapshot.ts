/** Resume position is last-write-wins, not the furthest watched position. */
export type PlaybackSnapshot = { seconds: number; updatedAt: number };

export function parsePlaybackSnapshot(value: unknown): PlaybackSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.seconds !== "number" || !Number.isFinite(row.seconds) || row.seconds < 0 ||
      typeof row.updatedAt !== "number" || !Number.isFinite(row.updatedAt) || row.updatedAt < 0) return null;
  return { seconds: Math.floor(row.seconds), updatedAt: row.updatedAt };
}

export function latestPlaybackSnapshot(local: PlaybackSnapshot | null, remote: PlaybackSnapshot | null) {
  if (!local) return remote;
  if (!remote) return local;
  return local.updatedAt >= remote.updatedAt ? local : remote;
}

function key(userId: string, artifactId: string) {
  return `yb_playback_snapshot_v2:${userId}:${artifactId}`;
}

export function readPlaybackSnapshot(userId: string, artifactId: string): PlaybackSnapshot | null {
  try { return parsePlaybackSnapshot(JSON.parse(sessionStorage.getItem(key(userId, artifactId)) ?? "null")); }
  catch { return null; }
}

export function writePlaybackSnapshot(userId: string, artifactId: string, snapshot: PlaybackSnapshot) {
  try { sessionStorage.setItem(key(userId, artifactId), JSON.stringify(snapshot)); }
  catch { /* Playback remains usable if storage is unavailable. */ }
}
