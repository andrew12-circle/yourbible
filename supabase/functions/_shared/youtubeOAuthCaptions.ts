import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { parseWebVttToTimedText } from "./youtubeInvidiousTranscript.ts";
import { getValidYouTubeAccessToken } from "./youtubeOAuth.ts";

type CaptionSnippet = {
  language?: string;
  trackKind?: string;
  name?: string;
};

type CaptionItem = { id?: string; snippet?: CaptionSnippet };

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function decodeHtml(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(Number.parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function normalizeCaptionSegment(text: string): string {
  return decodeHtml(text).replace(/\s+/g, " ").trim();
}

type Json3Seg = { utf8?: string; tOffsetMs?: number };
type Json3Event = { tStartMs?: number; segs?: Json3Seg[] };

function linesFromJson3Event(event: Json3Event): string[] {
  const baseMs = Math.max(0, event.tStartMs ?? 0);
  const segs = event.segs ?? [];
  if (!segs.some((s) => normalizeCaptionSegment(s.utf8 ?? ""))) return [];

  const hasWordLevelOffsets = segs.some((s) => typeof s.tOffsetMs === "number" && s.tOffsetMs > 0);
  if (!hasWordLevelOffsets) {
    const stamp = formatTime(Math.floor(baseMs / 1000));
    const out: string[] = [];
    for (const seg of segs) {
      const t = normalizeCaptionSegment(seg.utf8 ?? "");
      if (!t) continue;
      out.push(`[${stamp}] ${t}`);
    }
    return out;
  }

  const out: string[] = [];
  let lastMs = baseMs;
  for (const seg of segs) {
    const t = normalizeCaptionSegment(seg.utf8 ?? "");
    if (!t) continue;
    if (typeof seg.tOffsetMs === "number") lastMs = baseMs + seg.tOffsetMs;
    out.push(`[${formatTime(Math.floor(lastMs / 1000))}] ${t}`);
  }
  return out;
}

function parseSrv3CaptionBody(body: string): string | null {
  try {
    const json = JSON.parse(body) as { events?: Json3Event[] };
    const lines = (json.events ?? []).flatMap((event) => linesFromJson3Event(event)).filter(Boolean);
    return lines.join("\n").trim() || null;
  } catch {
    return parseWebVttToTimedText(body);
  }
}

function pickCaptionTrack(items: CaptionItem[]): CaptionItem | null {
  if (!items.length) return null;
  const score = (item: CaptionItem): number => {
    const lang = (item.snippet?.language ?? "").toLowerCase();
    const kind = (item.snippet?.trackKind ?? "").toUpperCase();
    let s = 0;
    if (lang.startsWith("en")) s += 10;
    if (kind !== "ASR") s += 5;
    return s;
  };
  return [...items].sort((a, b) => score(b) - score(a))[0] ?? null;
}

async function listCaptionTracks(accessToken: string, videoId: string): Promise<CaptionItem[]> {
  const u = new URL("https://www.googleapis.com/youtube/v3/captions");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("videoId", videoId);
  const apiKey = Deno.env.get("YOUTUBE_DATA_API_KEY")?.trim();
  if (apiKey) u.searchParams.set("key", apiKey);

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (res.status === 403 || res.status === 404) return [];
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`captions.list HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json() as { items?: CaptionItem[] };
  return json.items ?? [];
}

async function downloadCaptionTrack(accessToken: string, captionId: string, tfmt: "srv3" | "vtt"): Promise<string | null> {
  const u = new URL(`https://www.googleapis.com/youtube/v3/captions/${encodeURIComponent(captionId)}`);
  u.searchParams.set("tfmt", tfmt);
  const apiKey = Deno.env.get("YOUTUBE_DATA_API_KEY")?.trim();
  if (apiKey) u.searchParams.set("key", apiKey);

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "*/*" },
  });
  if (!res.ok) return null;
  const body = await res.text();
  if (tfmt === "vtt") return parseWebVttToTimedText(body);
  return parseSrv3CaptionBody(body);
}

/**
 * Download captions via YouTube Data API v3 when the user has connected YouTube OAuth.
 * Works for videos on the authenticated channel (including private/unlisted uploads).
 */
export async function fetchCaptionsViaYouTubeOAuth(
  admin: SupabaseClient,
  userId: string,
  videoId: string,
): Promise<string | null> {
  const accessToken = await getValidYouTubeAccessToken(admin, userId);
  if (!accessToken) return null;

  const tracks = await listCaptionTracks(accessToken, videoId);
  const track = pickCaptionTrack(tracks);
  if (!track?.id) return null;

  const srv3 = await downloadCaptionTrack(accessToken, track.id, "srv3");
  if (srv3?.trim()) return srv3;
  return downloadCaptionTrack(accessToken, track.id, "vtt");
}
