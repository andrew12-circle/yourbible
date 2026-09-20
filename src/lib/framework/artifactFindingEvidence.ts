import type { TranscriptSegment } from "@/lib/transcriptSplit";

export type ArtifactFindingEvidence = {
  analysis_run_id?: string | null;
  source_quote?: string | null;
  source_segment_ids?: string[] | null;
  source_start_seconds?: number | null;
  source_end_seconds?: number | null;
  source_timing_kind?: "measured" | "estimated" | "unavailable" | null;
  importance_score?: number | null;
  importance_reason?: string | null;
  is_primary?: boolean;
  retired_at?: string | null;
};
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

/** Never reconstruct evidence from keyword overlap or AI-suggested Bible references. */
export function resolveFindingEvidence(claim: ArtifactFindingEvidence, segments: TranscriptSegment[]): TranscriptSegment | null {
  const quote = claim.source_quote?.trim();
  const ids = claim.source_segment_ids;
  if (!quote || !ids?.length) return null;
  const sourceIds = [...new Set(ids.map(id => id.replace(/:\d+$/, "")))];
  const readable = segments.filter(s => !s.isParagraphBreak && s.text.trim());
  const indexes = sourceIds.map(id => readable.findIndex(s => s.id === id));
  if (indexes.some((n, i) => n < 0 || (i > 0 && n !== indexes[i - 1] + 1))) return null;
  const sources = indexes.map(i => readable[i]);
  if (!normalize(sources.map(s => s.text).join(" ")).includes(normalize(quote))) return null;
  const first = sources[0];
  return { ...first, text: quote,
    timestampEstimated: Boolean(first.timestampEstimated || claim.source_timing_kind === "estimated"),
    startSeconds: claim.source_timing_kind === "unavailable" ? null : first.startSeconds };
}

export function principalFindings<T extends { is_primary?: boolean; importance_score?: number | null }>(claims: T[]): T[] {
  const primary = claims.filter(c => c.is_primary);
  return [...(primary.length ? primary : claims)]
    .sort((a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0)).slice(0, 8);
}
