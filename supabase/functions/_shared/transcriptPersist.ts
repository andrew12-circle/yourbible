import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { chunkTranscriptSegments } from "./semanticChunker.ts";
import type { TranscriptFetchResult, TranscriptSegmentRow } from "./transcriptTypes.ts";

export async function persistTranscriptSegments(
  admin: SupabaseClient,
  params: {
    artifactId: string;
    userId: string;
    segments: TranscriptSegmentRow[];
  },
): Promise<void> {
  const { artifactId, userId, segments } = params;
  await admin.from("artifact_transcript_segments").delete().eq("artifact_id", artifactId);
  if (!segments.length) return;

  const rows = segments.map((s) => ({
    artifact_id: artifactId,
    user_id: userId,
    seq: s.seq,
    start_seconds: s.start_seconds,
    end_seconds: s.end_seconds,
    text: s.text.slice(0, 8000),
    speaker: s.speaker,
    confidence: s.confidence,
    source: s.source,
  }));

  const batch = 200;
  for (let i = 0; i < rows.length; i += batch) {
    const { error } = await admin.from("artifact_transcript_segments").insert(rows.slice(i, i + batch));
    if (error) throw new Error(`segment insert: ${error.message}`);
  }
}

export async function persistTranscriptChunks(
  admin: SupabaseClient,
  params: {
    artifactId: string;
    userId: string;
    segments: TranscriptSegmentRow[];
  },
): Promise<number> {
  const { artifactId, userId, segments } = params;
  await admin.from("artifact_transcript_chunks").delete().eq("artifact_id", artifactId);
  const chunks = chunkTranscriptSegments(segments);
  if (!chunks.length) return 0;

  const rows = chunks.map((c) => ({
    artifact_id: artifactId,
    user_id: userId,
    start_seconds: c.start_seconds,
    end_seconds: c.end_seconds,
    text: c.text,
    metadata: {},
  }));

  const { error } = await admin.from("artifact_transcript_chunks").insert(rows);
  if (error) throw new Error(`chunk insert: ${error.message}`);
  return rows.length;
}

export function processingStagesPatch(stage: string): Record<string, string> {
  return { [`processing_stages.${stage}`]: new Date().toISOString() };
}

export function transcriptMetadataPatch(result: TranscriptFetchResult): Record<string, unknown> {
  return {
    transcript_source: result.source,
    transcript_provider: result.provider,
    speaker_count: result.speakerCount,
    processing_stages: {
      transcribe: new Date().toISOString(),
    },
  };
}
