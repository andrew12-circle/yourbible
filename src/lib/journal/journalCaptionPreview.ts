import { buildJournalBodySegments, normalizeLiveVideoTranscript, type JournalBodySegment } from "./journalVideoBody";
import type { JournalVideoRow } from "./videos";

export type JournalCaptionPreview = { id: string; text: string; anchor: number };
export type JournalCaptionSnapshot = { id: string; body: string; anchor: number; text: string };
export type JournalCaptionSegment = JournalBodySegment | { kind: "caption"; caption: JournalCaptionPreview };

/** Locate an insertion without assigning a stale recording snapshot to the document. */
export function resolveJournalCaptionPreview(current: string, snap: JournalCaptionSnapshot): JournalCaptionPreview {
  const anchor = Math.max(0, Math.min(snap.anchor, snap.body.length));
  const text = normalizeLiveVideoTranscript(snap.text);
  if (current === snap.body) return { id: snap.id, text, anchor };
  let start = 0;
  while (start < snap.body.length && start < current.length && snap.body[start] === current[start]) start += 1;
  let oldEnd = snap.body.length;
  let newEnd = current.length;
  while (oldEnd > start && newEnd > start && snap.body[oldEnd - 1] === current[newEnd - 1]) { oldEnd -= 1; newEnd -= 1; }
  const rebased = anchor < start ? anchor : anchor >= oldEnd ? anchor + newEnd - oldEnd : newEnd;

  // Saving/recovery can publish captions while the recorder is still open.
  // Show only the uncommitted suffix, never a second copy of the saved paragraph.
  // Compare words so local capitalization/punctuation does not duplicate speech.
  const words = (value: string) => Array.from(value.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu));
  const spoken = words(text);
  const added = current.slice(start, newEnd);
  if (spoken.length) {
    for (const paragraph of added.matchAll(/[^\n]+/g)) {
      const saved = words(paragraph[0]);
      if (!saved.length || saved.length > spoken.length) continue;
      if (!saved.every((word, i) => word[0].toLocaleLowerCase() === spoken[i][0].toLocaleLowerCase())) continue;
      const remaining = saved.length === spoken.length ? "" : text.slice(spoken[saved.length].index);
      return { id: snap.id, text: remaining, anchor: start + paragraph.index + paragraph[0].length };
    }
  }
  return { id: snap.id, text, anchor: Math.max(0, Math.min(rebased, current.length)) };
}

/** A caption is a temporary block; all text offsets continue to refer to real journal text. */
export function buildJournalCaptionSegments(body: string, videos: JournalVideoRow[], caption?: JournalCaptionPreview | null): JournalCaptionSegment[] {
  const segments = buildJournalBodySegments(body, videos);
  if (!caption) return segments;
  const anchor = Math.max(0, Math.min(caption.anchor, body.length));
  const result: JournalCaptionSegment[] = [];
  let inserted = false;
  for (const segment of segments) {
    if (!inserted && segment.kind === "text" && anchor >= segment.start && anchor <= segment.end) {
      if (anchor > segment.start) result.push({ kind: "text", start: segment.start, end: anchor });
      result.push({ kind: "caption", caption });
      if (anchor < segment.end) result.push({ kind: "text", start: anchor, end: segment.end });
      inserted = true;
    } else if (!inserted && segment.kind === "video" && (segment.video.anchor_offset ?? 0) >= anchor) {
      result.push({ kind: "caption", caption }, segment);
      inserted = true;
    } else result.push(segment);
  }
  if (!inserted) result.push({ kind: "caption", caption });
  // Keep a place to type after live text, even in a brand-new/otherwise empty entry.
  if (result.at(-1)?.kind !== "text") result.push({ kind: "text", start: body.length, end: body.length });
  return result;
}
