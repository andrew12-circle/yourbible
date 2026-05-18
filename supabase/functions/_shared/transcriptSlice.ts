/**
 * Transcript parsing + time-window slicing for edge functions (mirrors client `transcriptSplit.ts`).
 */

export interface TranscriptSegment {
  id: string;
  label: string;
  text: string;
  startSeconds: number | null;
  isParagraphBreak?: boolean;
  isContinuation?: boolean;
  timestampEstimated?: boolean;
}

export interface TranscriptSplitResult {
  segments: TranscriptSegment[];
  timed: boolean;
  coarseTimestampsOnly: boolean;
}

function timestampToSeconds(value: string) {
  const parts = value.split(":").map((n) => Number(n));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? null;
}

function looksLikeTimedBracketInner(inner: string): boolean {
  const v = inner.trim();
  return /^\d{1,2}:\d{2}(?::\d{2})?(?:-\d{1,2}:\d{2}(?::\d{2})?)?$/.test(v);
}

function parseTimedBracketInner(inner: string): { label: string; startSeconds: number | null; endSeconds: number | null } {
  const v = inner.trim();
  const dashIdx = v.indexOf("-");
  if (dashIdx !== -1) {
    const first = v.slice(0, dashIdx).trim();
    const second = v.slice(dashIdx + 1).trim();
    return {
      label: v.replace(/-/g, "–"),
      startSeconds: timestampToSeconds(first),
      endSeconds: timestampToSeconds(second),
    };
  }
  const startSeconds = timestampToSeconds(v);
  return { label: v, startSeconds, endSeconds: null };
}

const TIMED_LINE_BOUNDARY_RE = /(?=\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:-\d{1,2}:\d{2}(?::\d{2})?)?\]\s*)/;

function bodyHasInlineTimestamps(body: string): boolean {
  return /\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:-\d{1,2}:\d{2}(?::\d{2})?)?\]\s*/.test(body);
}

export function expandTimedPhysicalLineChunks(rawLine: string): string[] {
  const line = rawLine.trimEnd();
  if (!line.trim()) return [];
  const pieces = line.split(TIMED_LINE_BOUNDARY_RE).map((p) => p.trim()).filter(Boolean);
  if (pieces.length <= 1) return [line];
  const head = pieces[0] ?? "";
  const headMatch = head.match(/^\s*\[([^\]]+)\]\s*/);
  if (!headMatch || !looksLikeTimedBracketInner(headMatch[1])) return [line];
  return pieces;
}

function lineStartsWithTimedBracket(line: string): boolean {
  const m = line.match(/^\s*\[([^\]]+)\]\s*/);
  return m != null && looksLikeTimedBracketInner(m[1]);
}

function markTimedContinuationRows(segments: TranscriptSegment[]): TranscriptSegment[] {
  let prevStart: number | null = null;
  return segments.map((segment) => {
    if (segment.isParagraphBreak) {
      prevStart = null;
      return segment;
    }
    const sameSecond =
      prevStart != null &&
      segment.startSeconds != null &&
      segment.startSeconds === prevStart;
    if (segment.startSeconds != null) prevStart = segment.startSeconds;
    else prevStart = null;
    if (!sameSecond) return segment;
    return { ...segment, isContinuation: true };
  });
}

const ESTIMATED_WORDS_PER_ROW = 15;

function splitTextIntoReadableRows(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentenceParts =
    normalized.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [normalized];

  const rows: string[] = [];
  for (const sentence of sentenceParts) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= 18) {
      rows.push(words.join(" "));
      continue;
    }
    for (let i = 0; i < words.length; i += ESTIMATED_WORDS_PER_ROW) {
      rows.push(words.slice(i, i + ESTIMATED_WORDS_PER_ROW).join(" "));
    }
  }
  return rows;
}

function buildEstimatedTimedRows(
  text: string,
  chunkStart: number,
  chunkEnd: number,
  label: string,
  idPrefix: string,
  indexBase: number,
): TranscriptSegment[] {
  const rows = splitTextIntoReadableRows(text);
  if (!rows.length) return [];

  const totalWords = rows.reduce((sum, r) => sum + r.split(/\s+/).filter(Boolean).length, 0);
  if (totalWords === 0) return [];

  const span = Math.max(0, chunkEnd - chunkStart);
  const out: TranscriptSegment[] = [];
  let wordOffset = 0;
  rows.forEach((rowText, j) => {
    const wc = rowText.split(/\s+/).filter(Boolean).length;
    const t = chunkStart + (span * wordOffset) / totalWords;
    wordOffset += wc;
    out.push({
      id: `${idPrefix}-est-${indexBase + j}`,
      label,
      text: rowText,
      startSeconds: Math.max(0, Math.floor(t)),
      timestampEstimated: true,
    });
  });
  return out;
}

export function splitTranscript(rawText: string): TranscriptSplitResult {
  const trimmed = rawText.trim();
  if (!trimmed) return { segments: [], timed: false, coarseTimestampsOnly: false };

  const physicalLines = rawText.split("\n");
  const timestampMode =
    physicalLines.some(lineStartsWithTimedBracket) || /\]\s*\[\s*\d{1,2}:\d{2}/.test(trimmed);

  if (timestampMode) {
    const out: TranscriptSegment[] = [];
    let index = 0;
    for (const rawLine of physicalLines) {
      const line = rawLine.trimEnd();
      if (line === "") {
        out.push({
          id: `transcript-br-${index}`,
          label: "",
          text: "",
          startSeconds: null,
          isParagraphBreak: true,
        });
        index += 1;
        continue;
      }
      const chunks = expandTimedPhysicalLineChunks(line);
      for (const chunk of chunks) {
        const m = chunk.match(/^\s*\[([^\]]+)\]\s*(.*)$/s);
        if (m && looksLikeTimedBracketInner(m[1])) {
          const { label, startSeconds, endSeconds } = parseTimedBracketInner(m[1]);
          const text = m[2].trim();
          if (!text) continue;

          const hasRange =
            endSeconds != null &&
            startSeconds != null &&
            endSeconds - startSeconds >= 30 &&
            !bodyHasInlineTimestamps(text);

          if (hasRange) {
            const estimated = buildEstimatedTimedRows(
              text,
              startSeconds,
              endSeconds,
              label,
              "transcript",
              index,
            );
            out.push(...estimated);
            index += estimated.length;
          } else {
            out.push({ id: `transcript-${index}`, label, text, startSeconds });
            index += 1;
          }
        } else {
          out.push({
            id: `transcript-${index}`,
            label: "",
            text: chunk.trim(),
            startSeconds: null,
          });
          index += 1;
        }
      }
    }
    const filtered = out.filter((s) => s.isParagraphBreak || s.text.trim());
    const segments = markTimedContinuationRows(filtered);
    const coarseTimestampsOnly = segments.some((s) => s.timestampEstimated);
    return { segments, timed: true, coarseTimestampsOnly };
  }

  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const noNewlinesInRaw = !/[\r\n]/.test(rawText);
  const sentenceGroupSize = noNewlinesInRaw ? 1 : 4;

  const chunks =
    paragraphs.length > 1
      ? paragraphs
      : (rawText.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [rawText])
          .map((sentence) => sentence.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .reduce<string[]>((acc, sentence, i) => {
            const group = Math.floor(i / sentenceGroupSize);
            acc[group] = `${acc[group] ? `${acc[group]} ` : ""}${sentence}`;
            return acc;
          }, []);

  return {
    segments: chunks.map((text, i) => ({
      id: `transcript-${i}`,
      label: `Part ${i + 1}`,
      text,
      startSeconds: null,
    })),
    timed: false,
    coarseTimestampsOnly: false,
  };
}

/** Segment rows whose `startSeconds` lies in `[rangeStartSec, rangeEndExclusiveSec)`. */
export function collectTranscriptTextsStartingInHalfOpenRange(
  segments: TranscriptSegment[],
  rangeStartSec: number,
  rangeEndExclusiveSec: number | null,
): string[] {
  const re = rangeEndExclusiveSec == null || !Number.isFinite(rangeEndExclusiveSec)
    ? Number.POSITIVE_INFINITY
    : rangeEndExclusiveSec;
  const rs = Math.max(0, rangeStartSec);
  const timed = segments.filter(
    (s): s is TranscriptSegment & { startSeconds: number } =>
      !s.isParagraphBreak && s.startSeconds != null && Number.isFinite(s.startSeconds),
  );
  const out: string[] = [];
  for (const seg of timed) {
    if (seg.startSeconds >= rs && seg.startSeconds < re) {
      const t = seg.text.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/** When timestamps are absent, approximate a wall-clock slice using duration metadata. */
export function sliceTextByDurationFraction(
  fullText: string,
  windowStartSec: number,
  windowEndExclusiveSec: number,
  durationSeconds: number,
): string {
  const D = Math.max(1, Math.floor(durationSeconds));
  const len = fullText.length;
  const endCap = Math.min(windowEndExclusiveSec, D);
  const a = Math.min(len, Math.max(0, Math.floor((windowStartSec / D) * len)));
  const b = Math.min(len, Math.max(a + 1, Math.floor((endCap / D) * len)));
  return fullText.slice(a, b).trim();
}
