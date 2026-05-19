/** Extra YouTube caption sources when watch-page playerCaptionsTracklist is empty (common on edge IPs). */

const YT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const INNERTUBE_WEB = {
  apiKey: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
  clientName: "WEB",
  clientVersion: "2.20250626.01.00",
};

export function normalizeYouTubeWatchUrl(url: string, videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

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

function parseJson3CaptionBody(body: string): string | null {
  try {
    const json = JSON.parse(body) as { events?: Json3Event[] };
    const lines = (json.events ?? []).flatMap((event) => linesFromJson3Event(event)).filter(Boolean);
    return lines.join("\n").trim() || null;
  } catch {
    const lines = [...body.matchAll(/<text[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)]
      .map((m) => {
        const startSeconds = Math.max(0, Math.floor(Number(m[1]) || 0));
        const line = normalizeCaptionSegment(m[2].replace(/<[^>]+>/g, ""));
        return line ? `[${formatTime(startSeconds)}] ${line}` : "";
      })
      .filter(Boolean);
    return lines.join("\n").trim() || null;
  }
}

async function listTimedTextLangs(videoId: string): Promise<string[]> {
  const res = await fetch(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`, { headers: YT_HEADERS });
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/lang_code="([^"]+)"/g)].map((m) => m[1]).filter(Boolean);
}

async function fetchTimedTextForLang(videoId: string, lang: string, kind?: "asr"): Promise<string | null> {
  const u = new URL("https://www.youtube.com/api/timedtext");
  u.searchParams.set("v", videoId);
  u.searchParams.set("lang", lang);
  u.searchParams.set("fmt", "json3");
  if (kind === "asr") u.searchParams.set("kind", "asr");
  const res = await fetch(u.toString(), { headers: YT_HEADERS });
  if (!res.ok) return null;
  return parseJson3CaptionBody(await res.text());
}

/** Public timedtext endpoint (no API key; works when watch-page captionTracks is empty). */
export async function fetchTimedTextTranscript(videoId: string): Promise<string | null> {
  const langs = await listTimedTextLangs(videoId).catch(() => [] as string[]);
  const preferred = [
    ...langs.filter((l) => /^en(?:-|$)/i.test(l) && !l.includes(".")),
    ...langs.filter((l) => /^en/i.test(l)),
    ...langs,
  ];
  const tryLangs = preferred.length ? [...new Set(preferred)] : ["en", "en-US", "en-GB", "a.en"];
  for (const lang of tryLangs) {
    const text = await fetchTimedTextForLang(videoId, lang).catch(() => null);
    if (text) return text;
    const asr = await fetchTimedTextForLang(videoId, lang, "asr").catch(() => null);
    if (asr) return asr;
  }
  if (!preferred.length) {
    const asrOnly = await fetchTimedTextForLang(videoId, "en", "asr").catch(() => null);
    if (asrOnly) return asrOnly;
  }
  return null;
}

function innertubeContext() {
  return {
    client: {
      clientName: INNERTUBE_WEB.clientName,
      clientVersion: INNERTUBE_WEB.clientVersion,
      hl: "en",
      gl: "US",
    },
  };
}

async function innertubePost(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
  const u = `https://youtubei.googleapis.com/youtubei/v1/${endpoint}?key=${INNERTUBE_WEB.apiKey}`;
  const res = await fetch(u, {
    method: "POST",
    headers: {
      ...YT_HEADERS,
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
    },
    body: JSON.stringify({ context: innertubeContext(), ...body }),
  });
  if (!res.ok) return null;
  return res.json();
}

function findTranscriptParams(obj: unknown): string | null {
  if (obj == null || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findTranscriptParams(item);
      if (found) return found;
    }
    return null;
  }
  const rec = obj as Record<string, unknown>;
  const ep = rec.getTranscriptEndpoint as { params?: string } | undefined;
  if (typeof ep?.params === "string" && ep.params.trim()) return ep.params;
  for (const v of Object.values(rec)) {
    const found = findTranscriptParams(v);
    if (found) return found;
  }
  return null;
}

function parseHmsToSeconds(stamp: string): number {
  const parts = stamp.trim().split(":").map((p) => Number(p.trim()));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function segmentStartSeconds(renderer: Record<string, unknown>): number {
  if (typeof renderer.startMs === "string") return Math.floor((Number(renderer.startMs) || 0) / 1000);
  if (typeof renderer.startMs === "number") return Math.floor(renderer.startMs / 1000);
  const simple = (renderer.startTimeText as { simpleText?: string } | undefined)?.simpleText;
  return simple ? parseHmsToSeconds(simple) : 0;
}

function segmentText(renderer: Record<string, unknown>): string {
  const runs = (renderer.snippet as { runs?: Array<{ text?: string }> } | undefined)?.runs ?? [];
  const fromRuns = runs.map((r) => r.text ?? "").join("").trim();
  if (fromRuns) return normalizeCaptionSegment(fromRuns);
  const simple = (renderer.snippet as { simpleText?: string } | undefined)?.simpleText;
  return simple ? normalizeCaptionSegment(simple) : "";
}

function findInitialSegments(obj: unknown): unknown[] | null {
  if (obj == null || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findInitialSegments(item);
      if (found?.length) return found;
    }
    return null;
  }
  const rec = obj as Record<string, unknown>;
  if (Array.isArray(rec.initialSegments) && rec.initialSegments.length) return rec.initialSegments;
  for (const v of Object.values(rec)) {
    const found = findInitialSegments(v);
    if (found?.length) return found;
  }
  return null;
}

function parseInnertubeTranscript(json: unknown): string | null {
  const segments = findInitialSegments(json);
  if (!segments?.length) return null;
  const lines: string[] = [];
  for (const seg of segments) {
    const renderer = (seg as { transcriptSegmentRenderer?: Record<string, unknown> }).transcriptSegmentRenderer;
    if (!renderer) continue;
    const text = segmentText(renderer);
    if (!text) continue;
    lines.push(`[${formatTime(segmentStartSeconds(renderer))}] ${text}`);
  }
  return lines.join("\n").trim() || null;
}

/** InnerTube get_transcript (same API as the YouTube web transcript panel). */
export async function fetchInnertubeTranscript(videoId: string): Promise<string | null> {
  const nextData = await innertubePost("next", { videoId });
  const params = nextData ? findTranscriptParams(nextData) : null;
  if (!params) return null;
  const transcriptData = await innertubePost("get_transcript", { params });
  if (!transcriptData) return null;
  return parseInnertubeTranscript(transcriptData);
}
