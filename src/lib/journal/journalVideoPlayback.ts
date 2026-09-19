/** Only scheduling information is read from this token; authorization stays server-side. */
export function journalVideoSignedUrlExpiresAt(url: string): number {
  try {
    const token = new URL(url, typeof location === "undefined" ? "https://localhost" : location.href).searchParams.get("token");
    if (!token) return Number.POSITIVE_INFINITY;
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : Number.POSITIVE_INFINITY;
  } catch { return Number.POSITIVE_INFINITY; }
}

export function journalVideoSignedUrlNeedsRenewal(url: string, now = Date.now()): boolean {
  return journalVideoSignedUrlExpiresAt(url) <= now + 60_000;
}

export type JournalVideoPlaybackSnapshot = {
  time: number;
  playing: boolean;
  rate: number;
  volume: number;
  muted: boolean;
};

export function snapshotJournalVideoPlayback(video: HTMLVideoElement): JournalVideoPlaybackSnapshot {
  return {
    time: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    playing: !video.paused && !video.ended,
    rate: video.playbackRate,
    volume: video.volume,
    muted: video.muted,
  };
}

export function restoreJournalVideoPlayback(video: HTMLVideoElement, snapshot: JournalVideoPlaybackSnapshot): void {
  video.playbackRate = snapshot.rate;
  video.volume = snapshot.volume;
  video.muted = snapshot.muted;
  const end = Number.isFinite(video.duration) && video.duration > 0 ? Math.max(0, video.duration - 0.05) : snapshot.time;
  if (snapshot.time > 0) video.currentTime = Math.min(snapshot.time, end);
  if (snapshot.playing) void video.play().catch(() => undefined);
}
