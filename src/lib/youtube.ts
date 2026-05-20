/**

 * Extract YouTube video id from common URL shapes (no network calls).

 */



const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;



/** Trim wrappers and ensure a parseable absolute URL. */

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



export function getYouTubeVideoId(url?: string | null): string | null {

  const normalized = url ? normalizeYouTubeInputUrl(url) : null;

  if (!normalized) return null;

  try {

    const parsed = new URL(normalized);

    if (!isYouTubeHost(parsed.hostname)) return null;



    if (parsed.hostname.replace(/^www\./, "").toLowerCase() === "youtu.be") {

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



export function buildYouTubeEmbedUrl(videoId: string, startSeconds = 0): string {
  const start = Math.max(0, Math.floor(startSeconds));
  const params = new URLSearchParams({
    autoplay: start > 0 ? "1" : "0",
    rel: "0",
    modestbranding: "1",
  });
  if (start > 0) params.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}



export function getYouTubeEmbedUrl(input?: string | null, startSeconds = 0): string | null {

  const id = getYouTubeVideoId(input);

  return id ? buildYouTubeEmbedUrl(id, startSeconds) : null;

}



export function youtubeMqThumbnail(videoId: string) {

  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

}



export function youtubeHqThumbnail(videoId: string) {

  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

}


