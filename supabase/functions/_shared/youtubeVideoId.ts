/** Robust YouTube video id extraction for edge functions (matches client `getYouTubeVideoId`). */

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function normalizeYouTubeInputUrl(input: string): string | null {
  let s = input.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!s) return null;
  s = s.replace(/^[\s<[(]+|[\s>)\],;]+$/g, "");
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

function sanitizeVideoId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const segment = raw.split("?")[0]?.split("#")[0]?.trim() ?? "";
  if (!segment) return null;
  if (YOUTUBE_ID_RE.test(segment)) return segment;
  const match = segment.match(/^([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function isYouTubeHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com");
}

export function extractYouTubeVideoId(url?: string | null): string | null {
  const normalized = url ? normalizeYouTubeInputUrl(url) : null;
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    if (!isYouTubeHost(parsed.hostname)) return null;

    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      return sanitizeVideoId(parsed.pathname.split("/").filter(Boolean)[0]);
    }

    const v = parsed.searchParams.get("v");
    if (v) return sanitizeVideoId(v);

    const parts = parsed.pathname.split("/").filter(Boolean);
    for (const key of ["shorts", "embed", "live", "v"] as const) {
      const idx = parts.indexOf(key);
      if (idx !== -1 && parts[idx + 1]) {
        const id = sanitizeVideoId(parts[idx + 1]);
        if (id) return id;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function metadataYouTubeVideoId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).video_id;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return sanitizeVideoId(raw.trim());
}

/** URL first, then artifact metadata, then explicit override from client. */
export function resolveYouTubeVideoId(
  url?: string | null,
  metadata?: unknown,
  explicitVideoId?: string | null,
): string | null {
  return extractYouTubeVideoId(url) ?? metadataYouTubeVideoId(metadata) ?? sanitizeVideoId(explicitVideoId);
}

export function isYouTubeUrl(url: string): boolean {
  const normalized = normalizeYouTubeInputUrl(url);
  if (!normalized) return false;
  try {
    return isYouTubeHost(new URL(normalized).hostname);
  } catch {
    return false;
  }
}

export function canonicalYouTubeWatchUrl(videoId: string, url?: string | null): string {
  const fromUrl = extractYouTubeVideoId(url);
  if (fromUrl === videoId) {
    const normalized = normalizeYouTubeInputUrl(url ?? "");
    if (normalized) return normalized.split("#")[0] ?? normalized;
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}
