// Fetches a YouTube transcript, then triggers framework-analyze.
// Prefer real YouTube caption tracks. If YouTube exposes no usable captions,
// fall back to clipped Gemini transcription so long videos never hit the 1M-token limit.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_SEGMENT_SECONDS = 20 * 60;
const GEMINI_MAX_DURATION_SECONDS = 3 * 60 * 60;

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "youtu.be" || u.hostname.endsWith("youtube.com");
  } catch {
    return false;
  }
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

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] ?? null;
    if (u.hostname.endsWith("youtube.com")) return u.searchParams.get("v") || u.pathname.match(/\/shorts\/([^/?#]+)/)?.[1] || null;
    return null;
  } catch {
    return null;
  }
}

function parseJsonObjectFromHtml(html: string, marker: string): unknown | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;
  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function normalizeCaptionText(lines: string[]): string {
  return lines
    .map((line) => decodeHtml(line).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCaptionSegment(text: string): string {
  return decodeHtml(text).replace(/\s+/g, " ").trim();
}

type Json3Seg = { utf8?: string; tOffsetMs?: number };
type Json3Event = { tStartMs?: number; segs?: Json3Seg[] };

/** One timed line per caption event, or per word-level seg when tOffsetMs is present (fixes single mega-event at 0:00). */
function linesFromJson3Event(event: Json3Event): string[] {
  const baseMs = Math.max(0, event.tStartMs ?? 0);
  const segs = event.segs ?? [];
  if (!segs.some((s) => normalizeCaptionSegment(s.utf8 ?? ""))) return [];

  const hasWordLevelOffsets = segs.some((s) => typeof s.tOffsetMs === "number" && s.tOffsetMs > 0);
  if (!hasWordLevelOffsets) {
    const startSeconds = Math.floor(baseMs / 1000);
    const stamp = formatTime(startSeconds);
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
    const startSeconds = Math.floor(lastMs / 1000);
    out.push(`[${formatTime(startSeconds)}] ${t}`);
  }
  return out;
}

/** Max merged body length so same-second word-level captions do not become one unreadable paragraph. */
const SAME_STAMP_MERGE_MAX_CHARS = 140;

/** Merge consecutive rows that share the same bracket stamp into one line only while the merged body stays short. */
function collapseAdjacentSameTimestampLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\[([^\]]+)\]\s*(.*)$/s);
    if (!m) {
      if (line.trim()) out.push(line);
      continue;
    }
    const stamp = m[1];
    const body = m[2].trim();
    const prev = out[out.length - 1];
    const pm = prev?.match(/^\[([^\]]+)\]\s*(.*)$/s);
    if (pm && pm[1] === stamp) {
      const prevBody = pm[2].trim();
      const merged = `${prevBody} ${body}`.trim();
      if (merged.length <= SAME_STAMP_MERGE_MAX_CHARS) {
        out[out.length - 1] = `[${stamp}] ${merged}`;
      } else {
        out.push(`[${stamp}] ${body}`);
      }
    } else {
      out.push(`[${stamp}] ${body}`);
    }
  }
  return out;
}

async function fetchCaptionTrack(baseUrl: string): Promise<string | null> {
  const captionUrl = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;
  const captionRes = await fetch(captionUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TranscriptFetcher/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!captionRes.ok) return null;

  const body = await captionRes.text();
  try {
    const json = JSON.parse(body) as { events?: Json3Event[] };
    const raw = (json.events ?? []).flatMap((event) => linesFromJson3Event(event)).filter(Boolean);
    const lines = collapseAdjacentSameTimestampLines(raw);
    return lines.join("\n").trim() || null;
  } catch {
    const lines = [...body.matchAll(/<text[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)]
      .map((m) => {
        const startSeconds = Math.max(0, Math.floor(Number(m[1]) || 0));
        const line = normalizeCaptionText([m[2].replace(/<[^>]+>/g, "")]);
        return line ? `[${formatTime(startSeconds)}] ${line}` : "";
      })
      .filter(Boolean);
    return lines.join("\n").trim() || null;
  }
}

type YouTubeMetadata = {
  title?: string;
  channelTitle?: string;
  channelUrl?: string;
  thumbnailUrl?: string;
  providerName?: string;
  durationSeconds?: number;
};

async function getYouTubeOEmbedMetadata(url: string): Promise<YouTubeMetadata> {
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TranscriptFetcher/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) return {};
  const json = await res.json() as {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
    provider_name?: string;
  };
  return {
    title: json.title,
    channelTitle: json.author_name,
    channelUrl: json.author_url,
    thumbnailUrl: json.thumbnail_url,
    providerName: json.provider_name,
  };
}

async function getYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  const oembed = await getYouTubeOEmbedMetadata(url).catch(() => ({}));
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TranscriptFetcher/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) return oembed;
  const html = await res.text();
  const duration = Number(html.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/)?.[1] ?? 0) || undefined;
  const channelTitle = html.match(/"ownerChannelName"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1]
    ?? html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/)?.[1];
  return {
    ...oembed,
    channelTitle: oembed.channelTitle ?? (channelTitle ? decodeHtml(channelTitle) : undefined),
    durationSeconds: duration,
  };
}

async function fetchYouTubeCaptionTranscript(url: string): Promise<{ text: string; title?: string } | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TranscriptFetcher/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!watchRes.ok) return null;
  const html = await watchRes.text();
  const playerResponse = parseJsonObjectFromHtml(html, "ytInitialPlayerResponse") as {
    videoDetails?: { title?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string; name?: { simpleText?: string; runs?: Array<{ text?: string }> } }> } };
  } | null;
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (!tracks.length) return null;

  const preferredTracks = [
    ...tracks.filter((t) => t.languageCode?.toLowerCase().startsWith("en") && t.kind !== "asr"),
    ...tracks.filter((t) => t.languageCode?.toLowerCase().startsWith("en") && t.kind === "asr"),
    ...tracks.filter((t) => !t.languageCode?.toLowerCase().startsWith("en")),
  ];

  for (const track of preferredTracks) {
    if (!track.baseUrl) continue;
    const text = await fetchCaptionTrack(track.baseUrl).catch(() => null);
    if (text) return { text, title: playerResponse?.videoDetails?.title };
  }

  return null;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function cleanGeminiTranscript(text: string): string {
  return text
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/\[(?:music|applause|laughter|silence|inaudible)[^\]]*\]/gi, " ")
    .replace(/\((?:music|applause|laughter|silence|inaudible)[^)]*\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function transcribeYouTubeSegment(url: string, startSeconds: number, endSeconds: number): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": GEMINI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Transcribe only the spoken words from ${formatTime(startSeconds)} to ${formatTime(endSeconds)} of this YouTube video. Return transcript text only. Do not summarize, invent, or add commentary.`,
            },
            {
              file_data: { mime_type: "video/mp4", file_uri: url },
              video_metadata: {
                start_offset: { seconds: startSeconds },
                end_offset: { seconds: endSeconds },
                fps: 0.1,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        mediaResolution: "MEDIA_RESOLUTION_LOW",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini segment ${formatTime(startSeconds)}-${formatTime(endSeconds)} failed: ${response.status} ${errorBody}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join(" ") ?? "";
  return cleanGeminiTranscript(text);
}

async function transcribeYouTubeWithGeminiClips(url: string, durationSeconds?: number): Promise<string> {
  const totalSeconds = Math.min(durationSeconds || GEMINI_SEGMENT_SECONDS, GEMINI_MAX_DURATION_SECONDS);
  const segments: string[] = [];

  for (let start = 0; start < totalSeconds; start += GEMINI_SEGMENT_SECONDS) {
    const end = Math.min(start + GEMINI_SEGMENT_SECONDS, totalSeconds);
    const segmentText = await transcribeYouTubeSegment(url, start, end);
    if (segmentText) segments.push(`[${formatTime(start)}-${formatTime(end)}] ${segmentText}`);
  }

  const transcript = segments.join("\n\n").trim();
  if (!transcript) throw new Error("Gemini returned an empty transcript for this video. Paste the transcript manually.");
  return transcript;
}

async function transcribeYouTubeVideo(url: string): Promise<{ text: string; metadata: YouTubeMetadata }> {
  const metadata = await getYouTubeMetadata(url).catch(() => ({}));

  const captionResult = await fetchYouTubeCaptionTranscript(url).catch(() => null);
  if (captionResult?.text) {
    return { text: captionResult.text, metadata: { ...metadata, title: metadata.title ?? captionResult.title } };
  }

  const text = await transcribeYouTubeWithGeminiClips(url, metadata.durationSeconds);
  return { text, metadata };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { artifact_id, url, processing_token } = (await req.json()) as { artifact_id?: string; url?: string; processing_token?: string };
    if (!artifact_id || !url || !processing_token) {
      return new Response(JSON.stringify({ error: "artifact_id, url, and processing_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("id,title,processing_token")
      .eq("id", artifact_id)
      .maybeSingle();
    if (!artifact || artifact.processing_token !== processing_token) {
      return new Response(JSON.stringify({ error: "stale request" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isYouTubeUrl(url)) {
      await supabase.from("artifacts").update({ status: "error", error: "Not a valid YouTube URL." }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: "Bad YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const processTranscript = async () => {
      try {
        const result = await transcribeYouTubeVideo(url);
        const uploaderName = result.metadata.channelTitle ?? null;
        const metadata = {
          source: "youtube",
          title: result.metadata.title ?? null,
          channel_title: uploaderName,
          /** Same as oEmbed `author_name` / HTML owner when available; list UI falls back if older rows lack both. */
          author_name: uploaderName,
          channel_url: result.metadata.channelUrl ?? null,
          thumbnail_url: result.metadata.thumbnailUrl ?? null,
          provider_name: result.metadata.providerName ?? "YouTube",
          duration_seconds: result.metadata.durationSeconds ?? null,
          video_id: extractYouTubeVideoId(url),
        };
        const { data: updated } = await supabase
          .from("artifacts")
          .update({
            raw_text: result.text,
            title: artifact.title || result.metadata.title || null,
            metadata,
            status: "analyzing",
            error: null,
          })
          .eq("id", artifact_id)
          .eq("processing_token", processing_token)
          .select("id")
          .maybeSingle();

        if (!updated) return;

        await fetch(`${SUPABASE_URL}/functions/v1/framework-analyze`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ artifact_id, processing_token }),
        }).catch((e) => console.error("analyze kick err", e));
      } catch (e) {
        const msg = `Could not fetch transcript: ${String((e as Error).message ?? e)}`;
        console.error(msg);
        await supabase.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
      }
    };

    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
    const transcriptJob = processTranscript();
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(transcriptJob);

    return new Response(JSON.stringify({ ok: true, queued: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
