import type { Highlight } from "@/hooks/useUserData";

export type VerseRange = {
  verse: number;
  /** Inclusive start, character index in plain verse text */
  start: number;
  /** Exclusive end */
  end: number;
};

export function findVerseFromNode(node: Node | null): number | null {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el) {
    const v = el.dataset?.verse;
    if (v) return Number(v);
    el = el.parentElement;
  }
  return null;
}

export function getVerseBodyElement(
  verse: number,
  root: ParentNode = document,
): HTMLElement | null {
  return root.querySelector(
    `[data-verse="${verse}"] [data-verse-body]`,
  ) as HTMLElement | null;
}

/** Character offset within `body` for a range boundary. */
export function offsetInVerseBody(
  body: HTMLElement,
  container: Node,
  offset: number,
): number {
  const r = document.createRange();
  r.selectNodeContents(body);
  r.setEnd(container, offset);
  return r.toString().length;
}

function rangeTouchesVerse(range: Range, body: HTMLElement): boolean {
  const bodyRange = document.createRange();
  bodyRange.selectNodeContents(body);
  return (
    range.compareBoundaryPoints(Range.END_TO_START, bodyRange) > 0 &&
    range.compareBoundaryPoints(Range.START_TO_END, bodyRange) < 0
  );
}

/**
 * Turn a live DOM selection into per-verse character ranges (plain text indices).
 */
export function selectionToVerseRanges(
  range: Range,
  verseLengths: Map<number, number>,
): VerseRange[] | null {
  const startVerse = findVerseFromNode(range.startContainer);
  const endVerse = findVerseFromNode(range.endContainer);
  if (startVerse == null || endVerse == null) return null;

  const lo = Math.min(startVerse, endVerse);
  const hi = Math.max(startVerse, endVerse);
  const out: VerseRange[] = [];

  for (let v = lo; v <= hi; v++) {
    const len = verseLengths.get(v);
    if (len == null) continue;
    const body = getVerseBodyElement(v);
    if (!body || !rangeTouchesVerse(range, body)) continue;

    const bodyRange = document.createRange();
    bodyRange.selectNodeContents(body);

    let start = 0;
    let end = len;

    if (v === startVerse) {
      start = offsetInVerseBody(
        body,
        range.startContainer,
        range.startOffset,
      );
    }
    if (v === endVerse) {
      end = offsetInVerseBody(body, range.endContainer, range.endOffset);
    }

    start = Math.max(0, Math.min(start, len));
    end = Math.max(start, Math.min(end, len));
    if (end > start) out.push({ verse: v, start, end });
  }

  return out.length > 0 ? out : null;
}

export function isRangeInReadingArea(range: Range): boolean {
  const container = (
    range.commonAncestorContainer instanceof HTMLElement
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
  ) as HTMLElement | null;
  return !!container?.closest("[data-reading-area]");
}

export type HighlightInterval = { start: number; end: number; color: string };

/** Merge highlight rows into sorted non-overlapping intervals (later row wins on overlap). */
export function highlightIntervalsForVerse(
  textLength: number,
  marks: Highlight[],
): HighlightInterval[] {
  const raw: HighlightInterval[] = [];
  for (const m of marks) {
    if ((m.kind ?? "highlight") !== "highlight") continue;
    const start = m.start_offset ?? 0;
    const end = m.end_offset ?? textLength;
    if (end > start) raw.push({ start, end, color: m.color });
  }
  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  return raw;
}

export type TextPart = { text: string; color?: string };

/** Split plain verse text into alternating plain / highlighted parts. */
export function sliceTextByHighlights(
  text: string,
  intervals: HighlightInterval[],
): TextPart[] {
  if (intervals.length === 0) return [{ text }];

  const parts: TextPart[] = [];
  let pos = 0;
  for (const iv of intervals) {
    if (iv.start > pos) parts.push({ text: text.slice(pos, iv.start) });
    const chunk = text.slice(iv.start, iv.end);
    if (chunk) parts.push({ text: chunk, color: iv.color });
    pos = Math.max(pos, iv.end);
  }
  if (pos < text.length) parts.push({ text: text.slice(pos) });
  return parts.length > 0 ? parts : [{ text }];
}
