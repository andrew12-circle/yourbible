// Fetches a YouTube transcript using Lovable AI (Gemini), then triggers framework-analyze.
// Gemini natively understands YouTube URLs, which is far more reliable than scraping
// captions (YouTube now blocks server-side caption fetching with PoToken requirements).
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
const SEGMENT_SECONDS = 20 * 60;
const MAX_SEGMENTS = 12;

function decodeHtml(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
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
  const filePart: Record<string, unknown> = { file_data: { file_uri: url, mime_type: "video/*" } };
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
          response_mime_type: "application/json",
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

  if (!durationSeconds || durationSeconds <= SEGMENT_SECONDS) {
    try {
      const result = await transcribeWithGemini(url, apiKey);
      return { text: result.text, title: result.title ?? metadata.title };
    } catch (e) {
      const message = String((e as Error).message ?? e);
      if (!message.includes("input token count exceeds") || !durationSeconds) throw e;
    }
  }

  if (!durationSeconds) {
    throw new Error("This video is too long for a single Gemini request, and its duration could not be read. Paste the transcript manually.");
  }

  const segments = Math.ceil(durationSeconds / SEGMENT_SECONDS);
  if (segments > MAX_SEGMENTS) {
    const maxMinutes = Math.floor((SEGMENT_SECONDS * MAX_SEGMENTS) / 60);
    throw new Error(`This video is too long to transcribe automatically (${formatTime(durationSeconds)}). Automatic YouTube transcription supports up to about ${maxMinutes} minutes; paste the transcript manually.`);
  }

  const transcriptParts: string[] = [];
  let title = metadata.title;
  for (let i = 0; i < segments; i += 1) {
    const start = i * SEGMENT_SECONDS;
    const end = Math.min(durationSeconds, start + SEGMENT_SECONDS);
    const segmentLabel = `${formatTime(start)}–${formatTime(end)}`;
    const result = await transcribeWithGemini(url, apiKey, { startSeconds: start, endSeconds: end, segmentLabel });
    if (!title && result.title) title = result.title;
    transcriptParts.push(result.text);
  }

  return { text: transcriptParts.join("\n\n").trim(), title };
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
