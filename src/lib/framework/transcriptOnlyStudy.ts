/** Deterministic, read-only excerpt selection. This module never calls an AI or writes research. */
import { BOOKS } from "@/data/books";
import { ETHIOPIAN_BOOKS } from "@/data/ethiopianBooks";
import { formatTranscriptClock, splitTranscript, type TranscriptSegment } from "@/lib/transcriptSplit";

export const LOCAL_STUDY_MAX_CHARS = 1_000_000;
export type LocalExcerpt = {
  id: string;
  quote: string;
  segmentIds: string[];
  startSeconds: number | null;
  approximate: boolean;
  region: "Opening" | "Middle" | "Closing";
  reason: string;
  references: string[];
};
export type TranscriptOnlyStudy = {
  method: "transcript-only-v1";
  status: "ready" | "empty" | "too_large";
  sourceChars: number;
  scannedSegments: number;
  excerpts: LocalExcerpt[];
  references: string[];
  referenceCount: number;
};

const STOP = new Set(("the and that this with from have your you our are was were will would could should " +
  "there their they them then than when where what which who been being into about also some more " +
  "very just like know going said says say because really these those here now can for but its his her " +
  "she him has had how all any much such does did each other through before after only over under").split(" "));
const PRODUCTION = /\b(subscribe|sponsor(?:ed)?|promo code|like and share|welcome (?:back|to)|thanks for (?:watching|listening))\b/i;
const NOISE = /^(?:\[(?:music|applause|silence|laughter)\]\s*)+$/i;
const bookNames = [...new Set([...BOOKS, ...ETHIOPIAN_BOOKS].map(b => b.name).concat("Psalm", "Song of Songs"))];
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bookPattern = bookNames.sort((a, b) => b.length - a.length).map(escapeRegex).join("|");

/** Detect written references only; these are mentions, not support for a claim or verified verse text. */
export function writtenScriptureReferences(text: string): string[] {
  const re = new RegExp(`\\b(${bookPattern})\\s+(\\d{1,3}):(\\d{1,3})(?:[–-](\\d{1,3}))?\\b`, "gi");
  const found = new Map<string, string>();
  for (const match of text.matchAll(re)) {
    const name = match[1].toLowerCase();
    const canonical = name === "psalm" ? "psalms" : name === "song of songs" ? "song of solomon" : name;
    const book = [...BOOKS, ...ETHIOPIAN_BOOKS].find(b => b.name.toLowerCase() === canonical);
    const chapter = Number(match[2]), verse = Number(match[3]);
    // Bounds catch obvious transcription errors; verse existence still needs a Bible lookup.
    if (!book || chapter < 1 || chapter > book.chapters || verse < 1 || verse > 176 ||
      (match[4] && (Number(match[4]) < verse || Number(match[4]) > 176))) continue;
    // A reference preceded by a number must not be misread as the unnumbered book.
    if (/\d\s*$/.test(text.slice(Math.max(0, match.index! - 3), match.index))) continue;
    const literal = match[0];
    const key = literal.toLowerCase().replace(/\s+/g, " ").replace(/–/g, "-");
    if (!found.has(key)) found.set(key, literal);
  }
  return [...found.values()];
}

function terms(text: string): string[] {
  return [...new Set((text.toLowerCase().match(/\p{L}{3,}/gu) ?? []).filter(t => !STOP.has(t)))];
}

type Candidate = LocalExcerpt & { words: string[]; score: number; order: number };

/** Bound cards without inventing sentence completions or changing a speaker's words. */
function splitLongRow(segment: TranscriptSegment): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  let start = 0;
  while (start < segment.text.length) {
    let end = Math.min(start + 650, segment.text.length);
    if (end < segment.text.length) {
      const space = segment.text.lastIndexOf(" ", end);
      if (space > start + 100) end = space;
    }
    const text = segment.text.slice(start, end).trim();
    if (text) out.push({ ...segment, text, timestampEstimated: segment.timestampEstimated || start > 0 });
    start = end;
    while (segment.text[start] === " ") start++;
  }
  return out;
}

export function buildTranscriptOnlyStudy(rawText: string): TranscriptOnlyStudy {
  const base: TranscriptOnlyStudy = { method: "transcript-only-v1", status: "empty", sourceChars: rawText.length,
    scannedSegments: 0, excerpts: [], references: [], referenceCount: 0 };
  // Explicit limit, not a hidden beginning-only truncation. Reading/searching remain available.
  if (rawText.length > LOCAL_STUDY_MAX_CHARS) return { ...base, status: "too_large" };
  if (!rawText.trim()) return base;
  // Some caption exports keep elapsed minutes above 99 instead of switching to H:MM:SS.
  const timedText = rawText.replace(/\[(\d{3}):([0-5]\d)\]/g,
    (_cue, minutes: string, seconds: string) => `[${formatTranscriptClock(Number(minutes) * 60 + Number(seconds))}]`);
  const segments = splitTranscript(timedText).segments;
  const nonempty = segments.filter(s => !s.isParagraphBreak && s.text.trim());
  const references = writtenScriptureReferences(nonempty.map(s => s.text).join(" "));
  const groups: TranscriptSegment[][] = [];
  let group: TranscriptSegment[] = [];
  let length = 0;
  const flush = () => { if (group.length) groups.push(group); group = []; length = 0; };
  for (const segment of segments) {
    if (segment.isParagraphBreak || NOISE.test(segment.text.trim())) { flush(); continue; }
    for (const row of splitLongRow(segment)) {
      const prev = group[group.length - 1];
      const largeGap = prev?.startSeconds != null && row.startSeconds != null &&
        (row.startSeconds < prev.startSeconds || row.startSeconds - prev.startSeconds > 45);
      if (largeGap || (length > 0 && length + row.text.length > 650)) flush();
      group.push(row); length += row.text.length + 1;
      if (length >= 260 && /[.!?]["')]*$/.test(row.text)) flush();
    }
  }
  flush();
  const candidates: Candidate[] = groups.map((rows, order) => {
    const quote = rows.map(r => r.text).join(" ");
    return { id: `local-${order}`, quote, order, segmentIds: [...new Set(rows.map(r => r.id))],
      startSeconds: rows[0].startSeconds, approximate: rows.some(r => Boolean(r.timestampEstimated)),
      region: order < groups.length / 3 ? "Opening" : order < 2 * groups.length / 3 ? "Middle" : "Closing",
      references: writtenScriptureReferences(quote), reason: "", words: terms(quote), score: 0 };
  });
  const frequency = new Map<string, number>();
  for (const c of candidates) for (const word of c.words) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  for (const c of candidates) {
    const repeated = c.words.filter(w => (frequency.get(w) ?? 0) > 1);
    c.score = repeated.reduce((n, w) => n + Math.log1p(frequency.get(w) ?? 0), 0) / Math.sqrt(Math.max(1, c.words.length));
    if (c.references.length) c.score += 1;
    if (PRODUCTION.test(c.quote)) c.score -= 5;
    c.reason = c.references.length ? "Contains a written Scripture reference."
      : repeated.length ? "Contains words repeated elsewhere in the saved transcript."
      : "Included to represent this part of the saved transcript.";
  }
  const ranked = candidates.filter(c => c.quote.length >= 60 && c.words.length >= 3)
    .sort((a, b) => b.score - a.score || a.order - b.order);
  const selected: Candidate[] = [];
  const seen = new Set<string>();
  const add = (candidate: Candidate) => {
    const key = candidate.quote.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key) || selected.length >= 6) return;
    seen.add(key); selected.push(candidate);
  };
  // Select across the whole source, not just the earliest/highest-density paragraph.
  for (const region of ["Opening", "Middle", "Closing"] as const) {
    let count = 0;
    for (const c of ranked.filter(c => c.region === region)) {
      const before = selected.length; add(c); if (selected.length > before) count++;
      if (count >= 2) break;
    }
  }
  for (const candidate of ranked) add(candidate);
  return { ...base, status: "ready", scannedSegments: nonempty.length,
    excerpts: selected.sort((a, b) => a.order - b.order).map(({ words: _words, score: _score, order: _order, ...c }) => c),
    references: references.slice(0, 30), referenceCount: references.length };
}
