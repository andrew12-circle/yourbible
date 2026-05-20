import type { TranscriptSegmentRow } from "../transcriptTypes.ts";
import { buildFetchResult } from "../transcriptNormalize.ts";

const POLL_MS = 2500;
const MAX_WAIT_MS = 15 * 60 * 1000;

type AssemblyUtterance = {
  start?: number;
  end?: number;
  text?: string;
  speaker?: string;
  confidence?: number;
};

function tier2Enabled(): boolean {
  const flag = Deno.env.get("TRANSCRIPT_TIER2_ENABLED")?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return Boolean(Deno.env.get("ASSEMBLYAI_API_KEY")?.trim());
}

function utterancesToSegments(utterances: AssemblyUtterance[]): TranscriptSegmentRow[] {
  return utterances
    .map((u, idx) => {
      const text = (u.text ?? "").trim();
      if (!text) return null;
      const startMs = typeof u.start === "number" ? u.start : 0;
      const endMs = typeof u.end === "number" ? u.end : null;
      return {
        seq: idx,
        start_seconds: Math.floor(startMs / 1000),
        end_seconds: endMs != null ? Math.ceil(endMs / 1000) : null,
        text,
        speaker: typeof u.speaker === "string" ? `Speaker ${u.speaker}` : null,
        confidence: typeof u.confidence === "number" ? u.confidence : null,
        source: "third_party" as const,
      };
    })
    .filter((x): x is TranscriptSegmentRow => x != null);
}

/** AssemblyAI prerecorded transcription from a YouTube watch URL. */
export async function fetchAssemblyAiTranscript(
  watchUrl: string,
): Promise<ReturnType<typeof buildFetchResult>> {
  const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("skipped — ASSEMBLYAI_API_KEY not set on edge function");
  }
  if (!tier2Enabled()) {
    throw new Error("skipped — TRANSCRIPT_TIER2_ENABLED is false");
  }

  const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url: watchUrl,
      speaker_labels: true,
      punctuate: true,
      format_text: true,
    }),
  });

  if (!submitRes.ok) {
    const body = await submitRes.text().catch(() => "");
    console.error("AssemblyAI submit", submitRes.status, body);
    throw new Error(`submit HTTP ${submitRes.status}: ${body.slice(0, 240)}`);
  }

  const submitJson = (await submitRes.json()) as { id?: string };
  const id = submitJson.id;
  if (!id) throw new Error("submit response missing transcript id");

  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { Authorization: apiKey },
    });
    if (!pollRes.ok) continue;
    const poll = (await pollRes.json()) as {
      status?: string;
      error?: string;
      utterances?: AssemblyUtterance[];
      text?: string;
    };

    if (poll.status === "error") {
      console.error("AssemblyAI error", poll.error);
      throw new Error(poll.error ?? "transcription error");
    }
    if (poll.status !== "completed") continue;

    const utterances = poll.utterances ?? [];
    if (utterances.length) {
      const segments = utterancesToSegments(utterances);
      if (segments.length) return buildFetchResult(segments, "third_party", "assemblyai");
    }

    const plain = (poll.text ?? "").trim();
    if (plain.length > 80) {
      const segments: TranscriptSegmentRow[] = [{
        seq: 0,
        start_seconds: 0,
        end_seconds: null,
        text: plain.slice(0, 50000),
        speaker: null,
        confidence: null,
        source: "third_party",
      }];
      return buildFetchResult(segments, "third_party", "assemblyai");
    }
    throw new Error("completed with no transcript text");
  }

  console.error("AssemblyAI poll timeout");
  throw new Error(`poll timeout after ${MAX_WAIT_MS / 1000}s`);
}
