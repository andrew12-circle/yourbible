import type { TranscriptSegmentRow } from "../transcriptTypes.ts";
import { buildFetchResult } from "../transcriptNormalize.ts";
import { logAiUsage } from "../logAiUsage.ts";

function audioSecondsFromSegments(segments: TranscriptSegmentRow[]): number {
  let maxEnd = 0;
  for (const s of segments) {
    if (typeof s.end_seconds === "number" && s.end_seconds > maxEnd) maxEnd = s.end_seconds;
  }
  return maxEnd > 0 ? maxEnd : 60;
}

type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
  speaker?: number;
  confidence?: number;
};

/** Transcribe a direct audio/media URL with Deepgram prerecorded API. */
export async function fetchDeepgramTranscript(
  audioUrl: string,
): Promise<ReturnType<typeof buildFetchResult>> {
  const apiKey = Deno.env.get("DEEPGRAM_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("skipped — DEEPGRAM_API_KEY not set on edge function (use: npx supabase secrets set DEEPGRAM_API_KEY=...)");
  }
  if (!audioUrl.trim()) {
    throw new Error("skipped — no audio URL");
  }

  const params = new URLSearchParams({
    model: "nova-2",
    punctuate: "true",
    utterances: "true",
    diarize: "true",
    smart_format: "true",
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Deepgram", res.status, body);
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 240)}`);
  }

  const json = (await res.json()) as {
    results?: {
      utterances?: DeepgramUtterance[];
      channels?: { alternatives?: { transcript?: string }[] }[];
    };
  };

  const utterances = json.results?.utterances ?? [];
  if (utterances.length) {
    const segments: TranscriptSegmentRow[] = utterances
      .map((u, idx) => {
        const text = (u.transcript ?? "").trim();
        if (!text) return null;
        return {
          seq: idx,
          start_seconds: Math.floor(u.start ?? 0),
          end_seconds: u.end != null ? Math.ceil(u.end) : null,
          text,
          speaker: u.speaker != null ? `Speaker ${u.speaker}` : null,
          confidence: typeof u.confidence === "number" ? u.confidence : null,
          source: "deepgram" as const,
        };
      })
      .filter((x): x is TranscriptSegmentRow => x != null);
    if (segments.length) {
      logAiUsage({
        operation: "stt",
        provider: "deepgram",
        model: "nova-2",
        status: "ok",
        audioSeconds: audioSecondsFromSegments(segments),
      });
      return buildFetchResult(segments, "deepgram", "deepgram");
    }
  }

  const plain = json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
  if (plain && plain.length > 40) {
    const segments: TranscriptSegmentRow[] = [{
      seq: 0,
      start_seconds: 0,
      end_seconds: null,
      text: plain.slice(0, 50000),
      speaker: null,
      confidence: null,
      source: "deepgram",
    }];
    logAiUsage({
      operation: "stt",
      provider: "deepgram",
      model: "nova-2",
      status: "ok",
      audioSeconds: 120,
    });
    return buildFetchResult(segments, "deepgram", "deepgram");
  }

  throw new Error("empty transcript in Deepgram response");
}
