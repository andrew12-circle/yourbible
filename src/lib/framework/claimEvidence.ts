export type EvidenceTranscriptSegment = {
  id: string; text: string; label: string; startSeconds: number | null;
  isParagraphBreak?: boolean; timestampEstimated?: boolean;
};
type IndexedTranscript = { text: string; rows: EvidenceTranscriptSegment[]; offsets: number[] };
const cache = new WeakMap<EvidenceTranscriptSegment[], IndexedTranscript>();
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
function indexTranscript(segments: EvidenceTranscriptSegment[]): IndexedTranscript {
  const previous = cache.get(segments);
  if (previous) return previous;
  const rows = segments.filter((s) => !s.isParagraphBreak && s.text.trim());
  const texts = rows.map((s) => normalize(s.text));
  let offset = 0;
  const offsets = texts.map((text) => { const start = offset; offset += text.length + 1; return start; });
  const result = { text: texts.join(" "), rows, offsets };
  cache.set(segments, result);
  return result;
}
function rowAtOffset(offsets: number[], offset: number): number {
  let left = 0; let right = offsets.length - 1;
  while (left < right) {
    const middle = Math.ceil((left + right) / 2);
    if (offsets[middle] <= offset) left = middle; else right = middle - 1;
  }
  return left;
}
/** Exact quote validation is not a claim-truth or speaker-intent verification. */
export function resolveFindingSource(raw: unknown, segments: EvidenceTranscriptSegment[]): EvidenceTranscriptSegment | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const evidence = raw as Record<string, unknown>;
  if (evidence.quote_verified !== true || typeof evidence.quote !== "string") return null;
  const quote = normalize(evidence.quote);
  if (quote.length < 12 || quote.length > 1800) return null;
  const indexed = indexTranscript(segments);
  const matches: number[] = [];
  for (let cursor = 0; cursor <= indexed.text.length - quote.length; ) {
    const found = indexed.text.indexOf(quote, cursor);
    if (found < 0) break;
    matches.push(found);
    if (matches.length > 100) return null;
    cursor = found + quote.length;
  }
  if (!matches.length) return null;
  let match = matches[0];
  if (matches.length > 1) {
    const time = evidence.start_seconds;
    if (typeof time !== "number" || !Number.isFinite(time)) return null;
    const anchored = matches.filter((offset) => indexed.rows[rowAtOffset(indexed.offsets, offset)]?.startSeconds === time);
    if (anchored.length !== 1) return null;
    match = anchored[0];
  }
  const first = indexed.rows[rowAtOffset(indexed.offsets, match)];
  if (!first) return null;
  return { ...first, text: quote,
    startSeconds: evidence.timing === "unavailable" ? null : first.startSeconds,
    timestampEstimated: evidence.timing !== "measured" || first.timestampEstimated === true,
  };
}
