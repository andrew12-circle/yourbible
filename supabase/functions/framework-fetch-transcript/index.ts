// Fetches a YouTube transcript, then triggers framework-analyze.
// Prefer real YouTube caption tracks. Gemini video transcription is only a
// fallback for shorter videos because long videos can exceed Gemini's 1M-token
// input window even when clipped with videoMetadata.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "youtu.be" || u.hostname.endsWith("youtube.com");
  } catch {
    return false;
  }
}

const MODEL = "gemini-2.5-flash";
const GEMINI_VIDEO_MAX_SECONDS = 45 * 60;

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

async function getYouTubeMetadata(url: string): Promise<{ title?: string; durationSeconds?: number }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TranscriptFetcher/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) return {};
  const html = await res.text();
  const duration = Number(html.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/)?.[1] ?? 0) || undefined;
  const rawTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1]
    ?? html.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1];
  let title: string | undefined;
  if (rawTitle) {
    try { title = decodeHtml(JSON.parse(`"${rawTitle}"`)); } catch { title = decodeHtml(rawTitle); }
  }
  return { title, durationSeconds: duration };
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

  const track = tracks.find((t) => t.languageCode?.toLowerCase().startsWith("en") && t.kind !== "asr")
    ?? tracks.find((t) => t.languageCode?.toLowerCase().startsWith("en"))
    ?? tracks[0];
  if (!track?.baseUrl) return null;

  const captionUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}&fmt=json3`;
  const captionRes = await fetch(captionUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TranscriptFetcher/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!captionRes.ok) return null;
  const body = await captionRes.text();

  let lines: string[] = [];
  try {
    const json = JSON.parse(body) as { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
    lines = (json.events ?? [])
      .flatMap((event) => event.segs ?? [])
      .map((seg) => seg.utf8 ?? "")
      .filter((text) => text.trim() && text !== "\n");
  } catch {
    lines = [...body.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => decodeHtml(m[1].replace(/<[^>]+>/g, "")));
  }

  const text = lines.join(" ").replace(/\s+([,.!?;:])/g, "$1").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return { text, title: playerResponse?.videoDetails?.title };
}

function parseGeminiTranscript(content: string): { text: string; title?: string } {
  let parsed: { title?: string; transcript?: string } | null = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
    }
  }
  const transcript = (parsed?.transcript ?? "").trim();
  const title = parsed?.title?.trim() || undefined;
  if (transcript) return { text: transcript, title };

  const fallback = content.trim();
  if (fallback.length > 40) return { text: fallback, title };
  throw new Error("Model returned no transcript. The video may be private, age-restricted, or have no spoken English.");
}

async function transcribeWithGemini(
  url: string,
  apiKey: string,
  options: { startSeconds?: number; endSeconds?: number; segmentLabel?: string } = {},
): Promise<{ text: string; title?: string }> {
  const isSegment = options.startSeconds !== undefined && options.endSeconds !== undefined;
  const prompt = `You are given ${isSegment ? `one clipped segment (${options.segmentLabel}) of ` : ""}a YouTube video. Transcribe the spoken English content verbatim.
Rules:
- Return ONLY a JSON object with this exact shape: {"title": string, "transcript": string}
- "title" is the video's title (or your best inference if none).
- "transcript" is the complete spoken transcript, no timestamps, no speaker labels unless clearly distinct.
- Do not describe visuals, comments, recommendations, or metadata.
- Preserve sentence punctuation. Do not summarize.
Video URL: ${url}`;

  // Use the native Gemini API — the OpenAI-compatible endpoint does NOT fetch
  // YouTube URLs and will hallucinate a transcript from the URL alone.
  const filePart: Record<string, unknown> = { fileData: { fileUri: url, mimeType: "video/*" } };
  if (isSegment) {
    filePart.videoMetadata = {
      startOffset: `${options.startSeconds}s`,
      endOffset: `${options.endSeconds}s`,
    };
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              filePart,
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 402) {
      throw new Error("Gemini API quota exhausted. Check your Google AI billing, then try again — or paste the transcript manually below.");
    }
    if (res.status === 429) {
      throw new Error("Gemini API is rate-limited right now. Wait a moment and try again, or paste the transcript manually below.");
    }
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .join("")
    .trim();
  if (!content) throw new Error("Empty response from transcription model.");

  return parseGeminiTranscript(content);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

async function transcribeYouTubeVideo(url: string, apiKey: string): Promise<{ text: string; title?: string }> {
  const metadata: { title?: string; durationSeconds?: number } = await getYouTubeMetadata(url).catch(() => ({}));
  const durationSeconds = metadata.durationSeconds;

  const captionResult = await fetchYouTubeCaptionTranscript(url).catch(() => null);
  if (captionResult?.text) {
    return { text: captionResult.text, title: captionResult.title ?? metadata.title };
  }

  if (!durationSeconds || durationSeconds <= GEMINI_VIDEO_MAX_SECONDS) {
    try {
      const result = await transcribeWithGemini(url, apiKey);
      return { text: result.text, title: result.title ?? metadata.title };
    } catch (e) {
      const message = String((e as Error).message ?? e);
      if (!message.includes("input token count exceeds") || !durationSeconds) throw e;
    }
  }

  if (!durationSeconds) {
    throw new Error("Captions were unavailable, and the video was too large for Gemini to transcribe safely.");
  }

  throw new Error(`Captions were unavailable, and this video is too long for Gemini to transcribe safely (${formatTime(durationSeconds)}).`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
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
      .select("id,processing_token")
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

    if (!GEMINI_API_KEY) {
      const msg = "Gemini API key not configured. Paste the transcript manually.";
      await supabase.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { text: string; title?: string };
    try {
      result = await transcribeYouTubeVideo(url, GEMINI_API_KEY);
    } catch (e) {
      const msg = `Could not transcribe video: ${String((e as Error).message ?? e)}. Paste the transcript manually.`;
      await supabase.from("artifacts").update({ status: "error", error: msg }).eq("id", artifact_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updated } = await supabase
      .from("artifacts")
      .update({
        raw_text: result.text,
        title: result.title ?? null,
        status: "analyzing",
        error: null,
      })
      .eq("id", artifact_id)
      .eq("processing_token", processing_token)
      .select("id")
      .maybeSingle();

    if (!updated) {
      return new Response(JSON.stringify({ ok: true, stale: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Kick off analyze
    fetch(`${SUPABASE_URL}/functions/v1/framework-analyze`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ artifact_id, processing_token }),
    }).catch((e) => console.error("analyze kick err", e));

    return new Response(JSON.stringify({ ok: true, length: result.text.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
