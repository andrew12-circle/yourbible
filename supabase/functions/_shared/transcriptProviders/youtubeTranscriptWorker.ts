import type { TranscriptSegmentRow } from "../transcriptTypes.ts";
import { buildFetchResult } from "../transcriptNormalize.ts";

type WorkerSegment = { start?: number; duration?: number; text?: string };
type WorkerResponse = { video_id?: string; language?: string; segments?: WorkerSegment[] };

const WORKER_SEQUENTIAL_MS = Number(Deno.env.get("TRANSCRIPT_WORKER_SEQUENTIAL_MS") ?? "25000");

/** True when the self-hosted Python transcript worker is configured. */
export function isWorkerConfigured(): boolean {
  return Boolean(Deno.env.get("TRANSCRIPT_WORKER_URL")?.trim());
}

/** Preferred auto path: dedicated worker with enough time (not capped by caption race). */
export async function fetchWorkerSequential(
  videoId: string,
): Promise<{ result: ReturnType<typeof buildFetchResult> | null; note: string }> {
  if (!isWorkerConfigured()) {
    return { result: null, note: "skipped — TRANSCRIPT_WORKER_URL not set on edge function" };
  }
  try {
    const result = await Promise.race([
      fetchWorkerTranscript(videoId),
      new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error(`timed out after ${WORKER_SEQUENTIAL_MS}ms`)), WORKER_SEQUENTIAL_MS);
      }),
    ]);
    if (result?.rawText?.trim()) return { result, note: "ok" };
    return { result: null, note: "empty transcript" };
  } catch (e) {
    return { result: null, note: String((e as Error).message ?? e) };
  }
}

/**
 * Fetch a YouTube transcript from the self-hosted `youtube-transcript-api`
 * worker (see worker/youtube-transcript). Returns the same shape as the other
 * transcript providers so persistence and downstream steps are unchanged.
 *
 * Throws on missing config / auth / no-captions / empty so the caller's ladder
 * cleanly falls through to the next tier.
 */
export async function fetchWorkerTranscript(
  videoId: string,
): Promise<ReturnType<typeof buildFetchResult>> {
  const baseUrl = Deno.env.get("TRANSCRIPT_WORKER_URL")?.trim();
  const token = Deno.env.get("TRANSCRIPT_WORKER_TOKEN")?.trim();
  if (!baseUrl) throw new Error("skipped — TRANSCRIPT_WORKER_URL not set on edge function");
  if (!token) throw new Error("skipped — TRANSCRIPT_WORKER_TOKEN not set on edge function");
  if (!videoId.trim()) throw new Error("skipped — no video id");

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/transcript`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ video_id: videoId, languages: ["en", "en-US", "en-GB"] }),
  });

  if (res.status === 404) {
    await res.text().catch(() => "");
    throw new Error("no captions available for this video");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 240)}`);
  }

  const json = (await res.json()) as WorkerResponse;
  const rawSegments = json.segments ?? [];
  const segments: TranscriptSegmentRow[] = rawSegments
    .map((seg, idx) => {
      const text = (seg.text ?? "").trim();
      if (!text) return null;
      const start = Math.max(0, Math.floor(seg.start ?? 0));
      const dur = typeof seg.duration === "number" && seg.duration > 0 ? seg.duration : 0;
      return {
        seq: idx,
        start_seconds: start,
        end_seconds: dur > 0 ? Math.ceil((seg.start ?? 0) + dur) : null,
        text,
        speaker: null,
        confidence: null,
        source: "third_party" as const,
      };
    })
    .filter((x): x is TranscriptSegmentRow => x != null);

  if (!segments.length) throw new Error("empty transcript from worker");
  return buildFetchResult(segments, "third_party", "youtube_transcript_worker");
}