import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import type { TranscriptSegmentSource } from "./transcriptTypes.ts";

export type CachedTranscript = {
  rawText: string;
  provider: string;
  source: TranscriptSegmentSource;
};

export async function getCachedYouTubeTranscript(
  admin: SupabaseClient | null,
  videoId: string | null,
): Promise<CachedTranscript | null> {
  if (!admin || !videoId?.trim()) return null;
  const { data, error } = await admin
    .from("youtube_transcript_cache")
    .select("raw_text,provider,source,expires_at")
    .eq("video_id", videoId)
    .maybeSingle();
  if (error || !data?.raw_text) return null;
  const expiresAt = data.expires_at ? new Date(data.expires_at as string).getTime() : 0;
  if (expiresAt > 0 && expiresAt < Date.now()) return null;
  const rawText = String(data.raw_text).trim();
  if (!rawText) return null;
  return {
    rawText,
    provider: String(data.provider ?? "youtube_cache"),
    source: (data.source as TranscriptSegmentSource) ?? "caption",
  };
}

export async function saveCachedYouTubeTranscript(
  admin: SupabaseClient | null,
  videoId: string | null,
  payload: CachedTranscript,
): Promise<void> {
  if (!admin || !videoId?.trim() || !payload.rawText.trim()) return;
  await admin.from("youtube_transcript_cache").upsert(
    {
      video_id: videoId,
      raw_text: payload.rawText,
      provider: payload.provider,
      source: payload.source,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "video_id" },
  );
}
