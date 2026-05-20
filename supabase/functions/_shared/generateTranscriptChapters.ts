/**
 * Build navigable chapters from a transcript when YouTube description chapters are missing.
 */
import type { YoutubeChapter } from "./youtubeChapters.ts";
import { splitTranscript, type TranscriptSegment } from "./transcriptSlice.ts";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";
const CHAPTER_TEXT_CAP = 120_000;
const MIN_CHAPTERS = 4;
const MAX_CHAPTERS = 16;

const CHAPTER_SYSTEM = `You outline long-form spoken content into navigable chapters for a study app.
Return chapters ONLY via the tool. Each chapter needs a short title (≤80 chars) and start_seconds aligned to the transcript timestamps.
Rules:
- First chapter MUST start at 0.
- start_seconds must strictly increase.
- ${MIN_CHAPTERS}–${MAX_CHAPTERS} chapters for a full talk; fewer only if the transcript is very short.
- Titles should name the topic shift (not "Part 1"); no marketing fluff.
- Use only times evidenced in the transcript; do not invent content beyond the text.`;

const CHAPTER_TOOL = {
  type: "function",
  function: {
    name: "submit_chapters",
    description: "Submit transcript-derived chapter markers.",
    parameters: {
      type: "object",
      properties: {
        chapters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              start_seconds: { type: "number" },
            },
            required: ["title", "start_seconds"],
          },
        },
      },
      required: ["chapters"],
    },
  },
} as const;

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Compact timed lines for the model; subsamples when very long. */
export function buildTimedTranscriptOutline(
  segments: TranscriptSegment[],
  maxChars = CHAPTER_TEXT_CAP,
): string {
  const rows = segments
    .filter((s) => !s.isParagraphBreak && s.text.trim() && s.startSeconds != null)
    .map((s) => `[${formatClock(s.startSeconds!)}] ${s.text.replace(/\s+/g, " ").trim()}`);

  if (!rows.length) return "";

  if (rows.join("\n").length <= maxChars) return rows.join("\n");

  const targetRows = Math.min(rows.length, 400);
  const step = Math.max(1, Math.ceil(rows.length / targetRows));
  const sampled: string[] = [];
  for (let i = 0; i < rows.length; i += step) sampled.push(rows[i]);
  if (sampled[sampled.length - 1] !== rows[rows.length - 1]) sampled.push(rows[rows.length - 1]);
  return sampled.join("\n").slice(0, maxChars);
}

export function normalizeGeneratedChapters(
  chapters: YoutubeChapter[],
  durationSeconds: number | null,
): YoutubeChapter[] {
  const cleaned = chapters
    .map((c) => ({
      title: c.title.replace(/\s+/g, " ").trim().slice(0, 120),
      start_seconds: Math.max(0, Math.floor(c.start_seconds)),
    }))
    .filter((c) => c.title.length > 0 && Number.isFinite(c.start_seconds));

  cleaned.sort((a, b) => a.start_seconds - b.start_seconds);

  const deduped: YoutubeChapter[] = [];
  for (const c of cleaned) {
    const last = deduped[deduped.length - 1];
    if (last && last.start_seconds === c.start_seconds) continue;
    deduped.push(c);
  }

  if (!deduped.length) return [];

  if (deduped[0].start_seconds !== 0) {
    deduped.unshift({ title: deduped[0].title, start_seconds: 0 });
  }

  const maxStart = durationSeconds != null && durationSeconds > 0
    ? durationSeconds - 1
    : deduped[deduped.length - 1].start_seconds;
  const bounded = deduped
    .map((c) => ({ ...c, start_seconds: Math.min(c.start_seconds, maxStart) }))
    .slice(0, MAX_CHAPTERS);

  return bounded;
}

export function heuristicChaptersFromTimed(
  segments: TranscriptSegment[],
  durationSeconds: number | null,
): YoutubeChapter[] {
  const timed = segments.filter((s) => s.startSeconds != null && s.text.trim());
  if (timed.length < 3) return [];

  const lastSec = timed[timed.length - 1].startSeconds ?? 0;
  const duration = durationSeconds != null && durationSeconds > 60
    ? durationSeconds
    : Math.max(lastSec + 120, 600);

  const target = Math.min(
    MAX_CHAPTERS,
    Math.max(MIN_CHAPTERS, Math.round(duration / 420)),
  );
  const step = Math.max(90, Math.floor(duration / target));

  const chapters: YoutubeChapter[] = [{ title: "Opening", start_seconds: 0 }];

  for (let t = step; t < duration - step * 0.4; t += step) {
    const seg = timed.find((s) => (s.startSeconds ?? 0) >= t) ?? timed[timed.length - 1];
    let title = seg.text.replace(/\s+/g, " ").trim();
    if (title.length > 72) title = `${title.slice(0, 69)}…`;
    if (!title) title = `Section ${chapters.length + 1}`;
    chapters.push({ title, start_seconds: t });
  }

  return normalizeGeneratedChapters(chapters, duration);
}

function buildChapterPrompt(params: {
  outline: string;
  durationSeconds: number | null;
  title?: string | null;
  timed: boolean;
  rawTextFallback: string;
}): string {
  const durationLine = params.durationSeconds != null
    ? `Video duration (seconds): ${params.durationSeconds}`
    : "Video duration: unknown — infer from last timestamp in the transcript.";

  const body = params.outline.trim() || params.rawTextFallback.slice(0, CHAPTER_TEXT_CAP);

  return `Talk title: ${params.title?.trim() || "Untitled"}
${durationLine}
Transcript is ${params.timed ? "timestamped" : "mostly untimestamped"}.

TRANSCRIPT${params.timed ? " (timed lines)" : ""}:
"""
${body}
"""

Identify ${MIN_CHAPTERS}–${MAX_CHAPTERS} major sections. Return submit_chapters with title and start_seconds for each section start.`;
}

async function callGeminiChapters(apiKey: string, userPrompt: string): Promise<Response> {
  return await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: CHAPTER_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      tools: [CHAPTER_TOOL],
      tool_choice: { type: "function", function: { name: "submit_chapters" } },
    }),
  });
}

function parseToolChapters(json: unknown): YoutubeChapter[] {
  const j = json as {
    choices?: { message?: { tool_calls?: { function?: { name?: string; arguments?: string } }[] } }[];
  };
  const argsStr = j?.choices?.[0]?.message?.tool_calls?.find((t) => t?.function?.name === "submit_chapters")
    ?.function?.arguments;
  if (!argsStr) return [];
  try {
    const parsed = JSON.parse(argsStr) as { chapters?: { title?: string; start_seconds?: number }[] };
    const raw = parsed.chapters ?? [];
    return raw
      .map((c) => ({
        title: typeof c.title === "string" ? c.title : "",
        start_seconds: typeof c.start_seconds === "number" ? c.start_seconds : Number(c.start_seconds),
      }))
      .filter((c) => c.title.trim() && Number.isFinite(c.start_seconds)) as YoutubeChapter[];
  } catch {
    return [];
  }
}

export type ChapterGenerationSource = "none" | "transcript_ai" | "transcript_heuristic";

export async function generateChaptersFromTranscript(params: {
  apiKey: string | null | undefined;
  rawText: string;
  durationSeconds: number | null;
  title?: string | null;
}): Promise<{ chapters: YoutubeChapter[]; source: ChapterGenerationSource }> {
  const trimmed = params.rawText.trim();
  if (trimmed.length < 200) return { chapters: [], source: "none" };

  const { segments, timed } = splitTranscript(trimmed);
  const outline = buildTimedTranscriptOutline(segments);
  const prompt = buildChapterPrompt({
    outline,
    durationSeconds: params.durationSeconds,
    title: params.title,
    timed,
    rawTextFallback: trimmed,
  });

  if (params.apiKey?.trim()) {
    try {
      const res = await callGeminiChapters(params.apiKey.trim(), prompt);
      if (res.ok) {
        const json = await res.json();
        const parsed = normalizeGeneratedChapters(
          parseToolChapters(json),
          params.durationSeconds,
        );
        if (parsed.length >= MIN_CHAPTERS) {
          return { chapters: parsed, source: "transcript_ai" };
        }
        console.warn(
          `generateChaptersFromTranscript: AI returned ${parsed.length} chapters (need ${MIN_CHAPTERS})`,
        );
      } else {
        console.error("generateChaptersFromTranscript: gemini", res.status, await res.text());
      }
    } catch (e) {
      console.error("generateChaptersFromTranscript: gemini error", e);
    }
  }

  if (timed && outline) {
    const heuristic = heuristicChaptersFromTimed(segments, params.durationSeconds);
    if (heuristic.length >= MIN_CHAPTERS) {
      return { chapters: heuristic, source: "transcript_heuristic" };
    }
  }

  return { chapters: [], source: "none" };
}
