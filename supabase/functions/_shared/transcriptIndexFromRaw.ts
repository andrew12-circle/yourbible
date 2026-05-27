import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { persistTranscriptChunks, persistTranscriptSegments } from "./transcriptPersist.ts";
import { segmentsFromTimedText } from "./transcriptNormalize.ts";
import { splitTranscript, type TranscriptSegment } from "./transcriptSlice.ts";
import type { TranscriptSegmentRow, TranscriptSegmentSource } from "./transcriptTypes.ts";

function splitSegmentsToRows(
  segments: TranscriptSegment[],
  source: TranscriptSegmentSource,
): TranscriptSegmentRow[] {
  const content = segments.filter((s) => !s.isParagraphBreak && s.text.trim());
  const rows: TranscriptSegmentRow[] = [];
  let seq = 0;
  let syntheticSec = 0;
  for (const s of content) {
    const start = s.startSeconds != null && Number.isFinite(s.startSeconds)
      ? Math.max(0, Math.floor(s.startSeconds))
      : syntheticSec;
    rows.push({
      seq: seq++,
      start_seconds: start,
      end_seconds: null,
      text: s.text.trim().slice(0, 8000),
      speaker: null,
      confidence: null,
      source,
    });
    syntheticSec = start + (s.startSeconds != null ? 25 : 45);
  }
  for (let i = 0; i < rows.length; i++) {
    const next = rows[i + 1];
    if (next) rows[i].end_seconds = next.start_seconds;
  }
  return rows;
}

/** Persist searchable transcript segments + chunks from artifact raw_text (paste or re-analyze). */
export async function indexArtifactTranscriptFromRaw(
  admin: SupabaseClient,
  params: {
    artifactId: string;
    userId: string;
    rawText: string;
    source?: TranscriptSegmentSource;
  },
): Promise<{ segmentCount: number; chunkCount: number }> {
  const raw = params.rawText.trim();
  if (!raw) {
    await persistTranscriptSegments(admin, { artifactId: params.artifactId, userId: params.userId, segments: [] });
    await persistTranscriptChunks(admin, { artifactId: params.artifactId, userId: params.userId, segments: [] });
    return { segmentCount: 0, chunkCount: 0 };
  }

  const source = params.source ?? "paste";
  let rows = segmentsFromTimedText(raw, source);
  if (!rows.length) {
    const split = splitTranscript(raw);
    rows = splitSegmentsToRows(split.segments, source);
  }

  await persistTranscriptSegments(admin, {
    artifactId: params.artifactId,
    userId: params.userId,
    segments: rows,
  });
  const chunkCount = await persistTranscriptChunks(admin, {
    artifactId: params.artifactId,
    userId: params.userId,
    segments: rows,
  });
  return { segmentCount: rows.length, chunkCount };
}
