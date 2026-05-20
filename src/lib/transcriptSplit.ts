/** Client-side transcript parsing for artifact detail (YouTube captions vs Gemini range chunks). */

export interface TranscriptSegment {
  id: string;
  label: string;
  text: string;
  startSeconds: number | null;
  /** Blank line in source — extra vertical space between blocks */
  isParagraphBreak?: boolean;
  /** Same on-screen second / stamp as previous row — subtle continuation styling */
  isContinuation?: boolean;
  /** Interpolated from a coarse `[start-end]` chunk; seek time is approximate */
  timestampEstimated?: boolean;
}

export interface TranscriptSplitResult {
  segments: TranscriptSegment[];
  timed: boolean;
  /** True when at least one row uses interpolated times (typical Gemini clip fallback). */
  coarseTimestampsOnly: boolean;
}

function timestampToSeconds(value: string) {
  const parts = value.split(":").map((n) => Number(n));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? null;
}

/** Display clock for claim source / play controls — never wordy YouTube UI durations. */
export function formatClaimSourceClock(
  startSeconds: number | null | undefined,
  label?: string,
): string | null {
  if (startSeconds != null && Number.isFinite(startSeconds)) {
    return formatTranscriptClock(startSeconds);
  }
  const inner = label?.trim() ?? "";
  if (!inner) return null;
  if (/hour|minute|second/i.test(inner)) return null;
  const clockMatch = inner.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (clockMatch) {
    const parts = clockMatch[1].split(":").map((n) => Number(n));
    if (!parts.some((n) => Number.isNaN(n))) {
      const secs =
        parts.length === 3
          ? parts[0] * 3600 + parts[1] * 60 + parts[2]
          : parts.length === 2
            ? parts[0] * 60 + parts[1]
            : parts[0];
      if (secs != null && Number.isFinite(secs)) return formatTranscriptClock(secs);
    }
  }
  return inner.length <= 14 ? inner : null;
}

/** Display clock for transcript rows (`m:ss` or `h:mm:ss`). */
export function formatTranscriptClock(seconds: number) {
  const rounded = Math.max(0, Math.floor(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Inner part of `[...]` must look like YouTube/Gemini times, not arbitrary brackets */
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

/** Split one physical line at `[m:ss]` / `[h:mm:ss]` boundaries (captions stored as a single-line blob). */
const TIMED_LINE_BOUNDARY_RE = /(?=\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:-\d{1,2}:\d{2}(?::\d{2})?)?\]\s*)/;

/** True if body text already contains caption-style inline timestamps */
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

/**
 * Collects trimmed segment texts whose timed span overlaps an inclusive wall-clock window
 * `[rangeStartSec, rangeEndSec]`. Each segment is treated as `[startSeconds, nextStart)`;
 * the final timed row uses an open end toward +∞.
 */
export function collectTranscriptTextOverlappingInclusiveRange(
  segments: TranscriptSegment[],
  rangeStartSec: number,
  rangeEndSec: number,
): string[] {
  const rs = Math.max(0, rangeStartSec);
  const re = Math.max(rs, rangeEndSec);
  const timed = segments.filter(
    (s): s is TranscriptSegment & { startSeconds: number } =>
      !s.isParagraphBreak && s.startSeconds != null && Number.isFinite(s.startSeconds),
  );
  if (!timed.length) return [];

  const out: string[] = [];
  for (let i = 0; i < timed.length; i++) {
    const seg = timed[i];
    const S = seg.startSeconds;
    const next = timed[i + 1];
    const E = next?.startSeconds != null && Number.isFinite(next.startSeconds) ? next.startSeconds : Number.POSITIVE_INFINITY;
    if (S <= re && E > rs) {
      const t = seg.text.trim();
      if (t) out.push(t);
    }
  }
  return out;
}
