import { buildFetchResult } from "../transcriptNormalize.ts";
import { mergeCaptionSegments } from "../mergeCaptionSegments.ts";
import type { TranscriptSegmentRow } from "../transcriptTypes.ts";

/** Same application deployment, not an unconfigured external transcript worker. */
export async function fetchHostedYouTubeCaptions(videoId: string, authorization: string): Promise<ReturnType<typeof buildFetchResult>> {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId) || !/^Bearer \S+$/i.test(authorization)) throw new Error("Caption request requires a video and authenticated user.");
  const origin = new URL(Deno.env.get("YOUTUBE_CAPTION_APP_ORIGIN")?.trim() || "https://yourbible-lodge.vercel.app");
  if (origin.protocol !== "https:" || origin.username || origin.password) throw new Error("Caption application origin must be HTTPS.");
  const response = await fetch(new URL("/api/youtube-captions", origin.origin), {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(25_000),
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: videoId }),
  });
  if (!response.ok) throw new Error(`Application captions HTTP ${response.status}`);
  if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("Application caption route returned HTML, not captions.");
  const data = await response.json() as { video_id?: string; segments?: Array<{ text?: string; start?: number; duration?: number }> };
  if (data.video_id !== videoId) throw new Error("Caption video identity mismatch.");
  if (!Array.isArray(data.segments) || !data.segments.length || data.segments.some((s) => typeof s.text !== "string"
    || !Number.isFinite(s.start) || s.start! < 0 || !Number.isFinite(s.duration) || s.duration! < 0)) throw new Error("Invalid caption response.");
  const segments: TranscriptSegmentRow[] = mergeCaptionSegments(data.segments).map((segment, seq) => ({
    seq, start_seconds: Math.floor(segment.start!), end_seconds: Math.ceil(segment.start! + segment.duration!),
    text: segment.text!, speaker: null, confidence: null, source: "caption",
  }));
  return buildFetchResult(segments, "caption", "vercel_youtube_captions");
}
