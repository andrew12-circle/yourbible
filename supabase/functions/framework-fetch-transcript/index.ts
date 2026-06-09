// Fetches a YouTube transcript, then triggers framework-analyze.
// Order: cache → parallel caption race (OAuth/worker/scrape) → AssemblyAI → Deepgram → Gemini.
// YOUTUBE_DATA_API_KEY enriches description/chapters only (not caption download).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { generateChaptersFromTranscript } from "../_shared/generateTranscriptChapters.ts";
import { parseYoutubeChaptersFromDescription } from "../_shared/youtubeChapters.ts";
import {
  planGeminiTranscribeSegments,
  parseIso8601Duration,
} from "../_shared/youtubeGeminiTranscribe.ts";
import {
  persistTranscriptChunks,
  persistTranscriptSegments,
  transcriptMetadataPatch,
} from "../_shared/transcriptPersist.ts";
import { clearAiUsageContext, setAiUsageContext } from "../_shared/logAiUsage.ts";
import type { TranscriptFetchResult } from "../_shared/transcriptTypes.ts";
import { resolveYouTubeAudioUrl } from "../_shared/youtubeAudioUrl.ts";
import { normalizeYouTubeWatchUrl } from "../_shared/youtubeTranscript.ts";
import { resolveYouTubeChannelThumbnail } from "../_shared/youtubeChannelAvatar.ts";
import {
  getCachedYouTubeTranscript,
  saveCachedYouTubeTranscript,
} from "../_shared/youtubeTranscriptCache.ts";
import {
  buildCaptionLanes,
  CAPTION_RACE_TIMEOUT_MS,
  fetchAssemblyFallback,
  fetchDeepgramFallback,
  fetchTranscriptPlusSequential,
  outcomeFromTimedText,
  raceCaptionLanes,
} from "../_shared/youtubeTranscriptRace.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_SEGMENT_SECONDS = 20 * 60;
/** Gemini YouTube URL input is limited to ~45 minutes with audio per request. */
const GEMINI_MAX_SINGLE_REQUEST_SECONDS = 45 * 60;
const GEMINI_MAX_DURATION_SECONDS = 3 * 60 * 60;

const YT_WATCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const TRANSCRIPT_JOB_DEADLINE_MS = Number(
  Deno.env.get("TRANSCRIPT_JOB_DEADLINE_MS") ?? String(180 * 1000),
);

function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
        ms,
      );
    }),
  ]);
}

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
  const captionRes = await fetch(captionUrl, { headers: YT_WATCH_HEADERS });
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
  channelThumbnailUrl?: string;
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
  if (!res.ok) {
    const videoId = extractYouTubeVideoId(url);
    const channelThumbnailUrl = await resolveYouTubeChannelThumbnail({
      videoId,
      channelUrl: oembed.channelUrl,
    }).catch(() => null);
    return {
      ...oembed,
      channelThumbnailUrl: channelThumbnailUrl ?? undefined,
    };
  }
  const html = await res.text();
  const duration =
    Number(html.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/)?.[1] ?? 0)
    || Number(html.match(/"approxDurationMs"\s*:\s*"?(\d+)"?/)?.[1] ?? 0) / 1000
    || undefined;
  const durationSeconds = duration && Number.isFinite(duration) ? Math.floor(duration) : undefined;
  const channelTitle = html.match(/"ownerChannelName"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1]
    ?? html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/)?.[1];
  const channelUrl = oembed.channelUrl;
  const videoId = extractYouTubeVideoId(url);
  const channelThumbnailUrl = await resolveYouTubeChannelThumbnail({
    videoId,
    channelUrl,
    watchHtml: html,
  }).catch(() => null);
  return {
    ...oembed,
    channelTitle: oembed.channelTitle ?? (channelTitle ? decodeHtml(channelTitle) : undefined),
    channelThumbnailUrl: channelThumbnailUrl ?? undefined,
    durationSeconds,
  };
}

async function fetchDurationViaDataApi(videoId: string): Promise<number | undefined> {
  const key = Deno.env.get("YOUTUBE_DATA_API_KEY");
  if (!key) return undefined;
  const u = new URL("https://www.googleapis.com/youtube/v3/videos");
  u.searchParams.set("part", "contentDetails");
  u.searchParams.set("id", videoId);
  u.searchParams.set("key", key);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return undefined;
  const json = await res.json() as { items?: Array<{ contentDetails?: { duration?: string } }> };
  const iso = json?.items?.[0]?.contentDetails?.duration;
  if (!iso) return undefined;
  const seconds = parseIso8601Duration(iso);
  return seconds ?? undefined;
}

async function resolveYouTubeDurationSeconds(
  url: string,
  hints: { fromMetadata?: number; fromWatchBundle?: number } = {},
): Promise<number | undefined> {
  const fromHints = [hints.fromMetadata, hints.fromWatchBundle].filter(
    (n): n is number => typeof n === "number" && n > 0,
  );
  if (fromHints.length) return Math.max(...fromHints);

  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return undefined;

  const fromApi = await fetchDurationViaDataApi(videoId);
  if (fromApi) return fromApi;

  const meta = await getYouTubeMetadata(url).catch(() => ({}));
  if (meta.durationSeconds && meta.durationSeconds > 0) return meta.durationSeconds;

  return undefined;
}

async function fetchDescriptionViaDataApi(videoId: string): Promise<string | null> {
  const key = Deno.env.get("YOUTUBE_DATA_API_KEY");
  if (!key) return null;
  const u = new URL("https://www.googleapis.com/youtube/v3/videos");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("id", videoId);
  u.searchParams.set("key", key);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = await res.json() as { items?: Array<{ snippet?: { description?: string } }> };
  const desc = json?.items?.[0]?.snippet?.description;
  return typeof desc === "string" && desc.trim() ? desc : null;
}

type WatchCaptionBundle = {
  text: string | null;
  title?: string;
  description?: string;
  durationSeconds?: number;
  chapters_source?: "youtube_data_api_v3" | "watch_player_response";
};

async function fetchYouTubeCaptionTranscript(url: string): Promise<WatchCaptionBundle | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
    headers: YT_WATCH_HEADERS,
  });
  if (!watchRes.ok) return null;
  const html = await watchRes.text();
  const playerResponse = parseJsonObjectFromHtml(html, "ytInitialPlayerResponse") as {
    videoDetails?: { title?: string; shortDescription?: string; lengthSeconds?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string; name?: { simpleText?: string; runs?: Array<{ text?: string }> } }> } };
  } | null;
  const watchDurationSeconds = Number(playerResponse?.videoDetails?.lengthSeconds ?? 0) || undefined;
  const descriptionFromPlayer = typeof playerResponse?.videoDetails?.shortDescription === "string"
    ? playerResponse.videoDetails.shortDescription
    : undefined;

  let descriptionForChapters = descriptionFromPlayer;
  let chaptersSource: WatchCaptionBundle["chapters_source"] = "watch_player_response";
  const apiDesc = await fetchDescriptionViaDataApi(videoId).catch(() => null);
  if (apiDesc) {
    descriptionForChapters = apiDesc;
    chaptersSource = "youtube_data_api_v3";
  }

  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (!tracks.length) {
    return {
      text: null,
      title: playerResponse?.videoDetails?.title,
      description: descriptionForChapters,
      durationSeconds: watchDurationSeconds,
      chapters_source: chaptersSource,
    };
  }

  const preferredTracks = [
    ...tracks.filter((t) => t.languageCode?.toLowerCase().startsWith("en") && t.kind !== "asr"),
    ...tracks.filter((t) => t.languageCode?.toLowerCase().startsWith("en") && t.kind === "asr"),
    ...tracks.filter((t) => !t.languageCode?.toLowerCase().startsWith("en")),
  ];

  for (const track of preferredTracks) {
    if (!track.baseUrl) continue;
    const text = await fetchCaptionTrack(track.baseUrl).catch(() => null);
    if (text) {
      return {
        text,
        title: playerResponse?.videoDetails?.title,
        description: descriptionForChapters,
        durationSeconds: watchDurationSeconds,
        chapters_source: chaptersSource,
      };
    }
  }

  return {
    text: null,
    title: playerResponse?.videoDetails?.title,
    description: descriptionForChapters,
    durationSeconds: watchDurationSeconds,
    chapters_source: chaptersSource,
  };
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

type GeminiTranscribeOpts = {
  watchUrl: string;
  startSeconds?: number;
  endSeconds?: number;
  prompt: string;
};

async function geminiTranscribeYouTube(opts: GeminiTranscribeOpts): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set (needed only when YouTube captions are unavailable).");
  }

  const { watchUrl, startSeconds, endSeconds, prompt } = opts;
  if (startSeconds == null || endSeconds == null) {
    throw new Error("clip start/end required (full-video Gemini requests are disabled)");
  }
  const clipLabel = `${formatTime(startSeconds)}-${formatTime(endSeconds)}`;

  const videoPart: Record<string, unknown> = {
    file_data: { file_uri: watchUrl },
  };
  if (startSeconds != null && endSeconds != null) {
    videoPart.video_metadata = {
      start_offset: `${startSeconds}s`,
      end_offset: `${endSeconds}s`,
    };
  }

  const bodyBase = {
    contents: [{
      role: "user",
      parts: [
        videoPart,
        { text: prompt },
      ],
    }],
  };

  const generationConfig = { temperature: 0, maxOutputTokens: 65536 };

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...bodyBase, generationConfig }),
      },
    );

    if (response.ok) {
      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join(" ") ?? "";
      return cleanGeminiTranscript(text);
    }

    lastError = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 2) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }

  throw new Error(`Gemini transcription (${clipLabel}) failed: ${lastError.slice(0, 400)}`);
}

async function transcribeYouTubeWithGemini(
  watchUrl: string,
  durationHint?: number,
): Promise<string> {
  const resolvedDuration = await resolveYouTubeDurationSeconds(watchUrl, {
    fromMetadata: durationHint,
  });
  const plan = planGeminiTranscribeSegments(resolvedDuration, {
    maxSingleRequestSeconds: GEMINI_MAX_SINGLE_REQUEST_SECONDS,
    maxDurationSeconds: GEMINI_MAX_DURATION_SECONDS,
    segmentSeconds: GEMINI_SEGMENT_SECONDS,
  });

  const parts: string[] = [];
  let emptyStreak = 0;

  for (const { start, end } of plan.segments) {
    const segmentText = await geminiTranscribeYouTube({
      watchUrl,
      startSeconds: start,
      endSeconds: end,
      prompt: `Transcribe only spoken words from ${formatTime(start)} to ${formatTime(end)}. Return transcript text only with [M:SS] or [H:MM:SS] timestamps in that range. Do not summarize or invent.`,
    });

    if (!segmentText.trim()) {
      emptyStreak += 1;
      if (!plan.durationKnown && emptyStreak >= 2) break;
      continue;
    }
    emptyStreak = 0;
    if (plan.segments.length === 1) {
      parts.push(segmentText);
    } else {
      parts.push(`[${formatTime(start)}-${formatTime(end)}] ${segmentText}`);
    }
  }

  const transcript = parts.join("\n\n").trim();
  if (!transcript) {
    throw new Error("Gemini returned an empty transcript. Paste the transcript manually.");
  }
  return transcript;
}

function buildTranscriptFailureMessage(tierAttempts: string[], geminiError?: string): string {
  const steps = [...tierAttempts];
  if (geminiError) {
    steps.push(`Gemini (chunked clips): ${geminiError}`);
  } else if (!Deno.env.get("GEMINI_API_KEY")) {
    steps.push("Gemini: skipped — GEMINI_API_KEY not set on edge function");
  }
  const edgeBlocked = steps.some((s) =>
    s.includes("no longer available") || s.includes("transcript-plus")
  );
  const hint = edgeBlocked
    ? "YouTube often blocks server fetches; retry after deploying the latest app build (browser caption fetch) or paste from YouTube (⋯ → Show transcript)."
    : "For long videos, paste from YouTube (⋯ → Show transcript) if automatic fetch keeps failing.";
  return [
    "Could not fetch transcript.",
    `Attempts: ${steps.join("; ")}.`,
    hint,
  ].join(" ");
}

type YoutubeTranscribeOutcome = {
  fetch: TranscriptFetchResult;
  metadata: YouTubeMetadata;
  chaptersBundle: WatchCaptionBundle | null;
};

async function transcribeYouTubeVideo(
  url: string,
  opts: { userId?: string; admin?: SupabaseClient | null } = {},
): Promise<YoutubeTranscribeOutcome> {
  const metadata = await getYouTubeMetadata(url).catch(() => ({}));
  const videoId = extractYouTubeVideoId(url);
  const watchUrl = videoId ? normalizeYouTubeWatchUrl(url, videoId) : url;
  const { userId, admin } = opts;
  const tierAttempts: string[] = [];

  const cached = await getCachedYouTubeTranscript(admin ?? null, videoId);
  if (cached) {
    tierAttempts.push("Cache: hit");
    return {
      fetch: outcomeFromTimedText(cached.rawText, cached.source, cached.provider),
      metadata,
      chaptersBundle: null,
    };
  }
  tierAttempts.push("Cache: miss");

  let chaptersBundle: WatchCaptionBundle | null = null;
  const ensureChaptersBundle = async () => {
    if (chaptersBundle) return chaptersBundle;
    chaptersBundle = await fetchYouTubeCaptionTranscript(url).catch(() => null);
    return chaptersBundle;
  };

  if (videoId) {
    const lanes = buildCaptionLanes({
      videoId,
      userId,
      admin,
      fetchWatchCaptions: async () => {
        const bundle = await ensureChaptersBundle();
        return bundle?.text ?? null;
      },
    });

    const { winner, attempts } = await raceCaptionLanes(lanes, CAPTION_RACE_TIMEOUT_MS);
    tierAttempts.push(...attempts);

    if (winner) {
      const bundle = await ensureChaptersBundle();
      const fetch = outcomeFromTimedText(winner.rawText, "caption", winner.provider);
      await saveCachedYouTubeTranscript(admin ?? null, videoId, {
        rawText: winner.rawText,
        provider: winner.provider,
        source: "caption",
      });
      return {
        fetch,
        metadata: { ...metadata, title: metadata.title ?? bundle?.title },
        chaptersBundle: bundle,
      };
    }
    tierAttempts.push(`Captions (parallel race): none within ${CAPTION_RACE_TIMEOUT_MS}ms`);

    const plusSeq = await fetchTranscriptPlusSequential(videoId);
    if (plusSeq.text) {
      tierAttempts.push("Captions (transcript-plus sequential): ok");
      const bundle = await ensureChaptersBundle();
      const fetch = outcomeFromTimedText(plusSeq.text, "caption", "youtube_transcript_plus");
      await saveCachedYouTubeTranscript(admin ?? null, videoId, {
        rawText: plusSeq.text,
        provider: "youtube_transcript_plus",
        source: "caption",
      });
      return {
        fetch,
        metadata: { ...metadata, title: metadata.title ?? bundle?.title },
        chaptersBundle: bundle,
      };
    }
    tierAttempts.push(`Captions (transcript-plus sequential): ${plusSeq.note}`);
  } else {
    tierAttempts.push("Captions: no video id");
  }

  const bundle = await ensureChaptersBundle();

  const assembly = await fetchAssemblyFallback(watchUrl);
  if (assembly?.rawText) {
    tierAttempts.push("AssemblyAI: ok");
    if (videoId) {
      await saveCachedYouTubeTranscript(admin ?? null, videoId, {
        rawText: assembly.rawText,
        provider: assembly.provider,
        source: "third_party",
      });
    }
    return {
      fetch: assembly,
      metadata: {
        ...metadata,
        durationSeconds: metadata.durationSeconds ?? bundle?.durationSeconds ?? null,
      },
      chaptersBundle: bundle,
    };
  }
  tierAttempts.push(
    Deno.env.get("ASSEMBLYAI_API_KEY")?.trim()
      ? "AssemblyAI: failed or empty"
      : "AssemblyAI: skipped — ASSEMBLYAI_API_KEY not set on edge function",
  );

  if (videoId) {
    const deepgram = await fetchDeepgramFallback(videoId, (id) => resolveYouTubeAudioUrl(id));
    if (deepgram?.rawText) {
      tierAttempts.push("Deepgram: ok");
      await saveCachedYouTubeTranscript(admin ?? null, videoId, {
        rawText: deepgram.rawText,
        provider: deepgram.provider,
        source: "deepgram",
      });
      return {
        fetch: deepgram,
        metadata: {
          ...metadata,
          durationSeconds: metadata.durationSeconds ?? bundle?.durationSeconds ?? null,
        },
        chaptersBundle: bundle,
      };
    }
    tierAttempts.push(
      Deno.env.get("DEEPGRAM_API_KEY")?.trim()
        ? "Deepgram: failed or no audio URL"
        : "Deepgram: skipped — DEEPGRAM_API_KEY not set on edge function",
    );
  }

  if (!Deno.env.get("GEMINI_API_KEY")) {
    throw new Error(buildTranscriptFailureMessage(tierAttempts));
  }

  const geminiMaxSec = Number(Deno.env.get("TRANSCRIPT_GEMINI_MAX_SECONDS") ?? "7200");
  const durationHint = metadata.durationSeconds ?? bundle?.durationSeconds;
  if (durationHint != null && durationHint > geminiMaxSec) {
    tierAttempts.push(
      `Gemini: skipped — video longer than ${Math.floor(geminiMaxSec / 60)} minutes (set TRANSCRIPT_GEMINI_MAX_SECONDS or paste transcript)`,
    );
    throw new Error(buildTranscriptFailureMessage(tierAttempts));
  }

  try {
    const text = await transcribeYouTubeWithGemini(watchUrl, durationHint);
    const fetch = outcomeFromTimedText(text, "gemini", "gemini_video_clips");
    if (videoId) {
      await saveCachedYouTubeTranscript(admin ?? null, videoId, {
        rawText: text,
        provider: "gemini_video_clips",
        source: "gemini",
      });
    }
    const mergedMetadata = {
      ...metadata,
      durationSeconds: metadata.durationSeconds ?? bundle?.durationSeconds ?? durationHint,
    };
    return { fetch, metadata: mergedMetadata, chaptersBundle: bundle };
  } catch (e) {
    throw new Error(buildTranscriptFailureMessage(tierAttempts, String((e as Error).message ?? e)));
  }
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

    const { artifact_id, url, processing_token, pre_fetched_captions } = (await req.json()) as {
      artifact_id?: string;
      url?: string;
      processing_token?: string;
      pre_fetched_captions?: string;
    };
    if (!artifact_id || !url || !processing_token) {
      return new Response(JSON.stringify({ error: "artifact_id, url, and processing_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: artifact } = await supabase
      .from("artifacts")
      .select("id,title,processing_token,metadata")
      .eq("id", artifact_id)
      .maybeSingle();
    if (!artifact || artifact.processing_token !== processing_token) {
      return new Response(JSON.stringify({ error: "stale request" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    setAiUsageContext({
      functionName: "framework-fetch-transcript",
      userId: u.user.id,
      artifactId: artifact_id,
    });

    if (!isYouTubeUrl(url)) {
      await supabase.from("artifacts").update({ status: "error", error: "Not a valid YouTube URL." }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: "Bad YouTube URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SERVICE_ROLE
      ? createClient(SUPABASE_URL, SERVICE_ROLE)
      : null;

    const processTranscript = async () => {
      try {
        const prefetched = pre_fetched_captions?.trim();
        const result = prefetched
          ? await (async (): Promise<YoutubeTranscribeOutcome> => {
            const metadata = await getYouTubeMetadata(url).catch(() => ({}));
            const fetch = outcomeFromTimedText(prefetched, "caption", "browser_captions");
            const vid = extractYouTubeVideoId(url);
            if (vid) {
              await saveCachedYouTubeTranscript(admin, vid, {
                rawText: prefetched,
                provider: "browser_captions",
                source: "caption",
              });
            }
            return { fetch, metadata, chaptersBundle: null };
          })()
          : await withDeadline(
            transcribeYouTubeVideo(url, { userId: u.user.id, admin }),
            TRANSCRIPT_JOB_DEADLINE_MS,
            "Transcript fetch",
          );
        const uploaderName = result.metadata.channelTitle ?? null;
        const vid = extractYouTubeVideoId(url);
        let desc = result.chaptersBundle?.description ?? "";
        let chaptersSource = result.chaptersBundle?.chapters_source ?? "none";
        if (!desc.trim() && vid) {
          const apiOnly = await fetchDescriptionViaDataApi(vid).catch(() => null);
          if (apiOnly) {
            desc = apiOnly;
            chaptersSource = "youtube_data_api_v3";
          }
        }
        let youtube_chapters = parseYoutubeChaptersFromDescription(desc);
        if (!youtube_chapters.length) chaptersSource = "none";
        if (!youtube_chapters.length && result.fetch.rawText.trim().length >= 400) {
          const generated = await generateChaptersFromTranscript({
            apiKey: Deno.env.get("GEMINI_API_KEY"),
            rawText: result.fetch.rawText,
            durationSeconds: result.metadata.durationSeconds ?? null,
            title: result.metadata.title ?? artifact.title,
          });
          if (generated.chapters.length) {
            youtube_chapters = generated.chapters;
            chaptersSource = generated.source;
          }
        }
        const prevMeta = (artifact.metadata as Record<string, unknown> | null | undefined) ?? {};
        const metadata = {
          ...prevMeta,
          ...transcriptMetadataPatch(result.fetch),
          source: "youtube",
          title: result.metadata.title ?? null,
          channel_title: uploaderName,
          /** Same as oEmbed `author_name` / HTML owner when available; list UI falls back if older rows lack both. */
          author_name: uploaderName,
          channel_url: result.metadata.channelUrl ?? null,
          channel_thumbnail_url: result.metadata.channelThumbnailUrl ?? null,
          thumbnail_url: result.metadata.thumbnailUrl ?? null,
          provider_name: result.metadata.providerName ?? "YouTube",
          duration_seconds: result.metadata.durationSeconds ?? null,
          video_id: extractYouTubeVideoId(url),
          youtube_chapters,
          youtube_chapters_source: chaptersSource,
        };

        const { data: artRow } = await supabase
          .from("artifacts")
          .select("user_id")
          .eq("id", artifact_id)
          .maybeSingle();
        const userId = artRow?.user_id as string | undefined;

        if (admin && userId && result.fetch.segments.length) {
          await persistTranscriptSegments(admin, {
            artifactId: artifact_id,
            userId,
            segments: result.fetch.segments,
          });
          await persistTranscriptChunks(admin, {
            artifactId: artifact_id,
            userId,
            segments: result.fetch.segments,
          });
        }

        const { data: updated } = await supabase
          .from("artifacts")
          .update({
            raw_text: result.fetch.rawText,
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

        if (admin && userId) {
          await fetch(`${SUPABASE_URL}/functions/v1/framework-embed-transcript`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_ROLE}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ artifact_id, user_id: userId }),
          }).catch((e) => console.error("embed-transcript kick err", e));
        }
      } catch (e) {
        const raw = String((e as Error).message ?? e);
        const msg = raw.startsWith("Could not fetch transcript:") ? raw : `Could not fetch transcript: ${raw}`;
        console.error(msg);
        const db = admin ?? supabase;
        await db.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
      }
    };

    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
    const transcriptJob = processTranscript();
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(transcriptJob);
    else await transcriptJob;

    return new Response(JSON.stringify({ ok: true, queued: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    clearAiUsageContext();
  }
});
