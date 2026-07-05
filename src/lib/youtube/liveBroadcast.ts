import { normalizeYouTubeInputUrl } from "@/lib/youtube";

/** YouTube live watch URLs use `/live/{id}` — distinct from VOD watch links. */
export function isYouTubeLiveUrl(url?: string | null): boolean {
  const normalized = url ? normalizeYouTubeInputUrl(url) : null;
  if (!normalized) return false;
  try {
    const parts = new URL(normalized).pathname.split("/").filter(Boolean);
    return parts.includes("live") && Boolean(parts[parts.indexOf("live") + 1]);
  } catch {
    return false;
  }
}

export function metadataIndicatesLiveBroadcast(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const m = metadata as Record<string, unknown>;
  if (m.live_broadcast === true) return true;
  const liveCapture = m.live_capture;
  if (liveCapture && typeof liveCapture === "object" && !Array.isArray(liveCapture)) {
    return true;
  }
  return false;
}

/** True when playback should stay at the live edge (no VOD resume seeks). */
export function resolveLiveBroadcast(
  url?: string | null,
  metadata?: unknown,
): boolean {
  return isYouTubeLiveUrl(url) || metadataIndicatesLiveBroadcast(metadata);
}

export function liveBroadcastArtifactMetadata(videoId: string, url: string) {
  return {
    source: "youtube" as const,
    video_id: videoId,
    live_broadcast: true,
    import_via: "live_watch" as const,
    saved_at: new Date().toISOString(),
    watch_url: url.trim(),
  };
}
