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

/** Walk sibling elements when the boundary sits on inter-verse whitespace. */
function findVerseFromNodeOrSibling(
  node: Node | null,
  direction: "before" | "after",
): number | null {
  const direct = findVerseFromNode(node);
  if (direct != null) return direct;
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    let sib: Node | null =
      direction === "before" ? node.previousSibling : node.nextSibling;
    while (sib) {
      const v = findVerseFromNode(sib);
      if (v != null) return v;
      sib = direction === "before" ? sib.previousSibling : sib.nextSibling;
    }
  }

  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : node.parentElement;
  if (!el) return null;

  let sib: Element | null =
    direction === "before" ? el.previousElementSibling : el.nextElementSibling;
  while (sib) {
    const v = (sib as HTMLElement).dataset?.verse;
    if (v) return Number(v);
    sib =
      direction === "before"
        ? sib.previousElementSibling
        : sib.nextElementSibling;
  }
  return null;
}

export function findVerseFromRangeBoundary(
  range: Range,
  which: "start" | "end",
): number | null {
  const node = nodeAtRangeBoundary(range, which);
  const primary = which === "start" ? "before" : "after";
  const secondary = which === "start" ? "after" : "before";
  return (
    findVerseFromNodeOrSibling(node, primary) ??
    findVerseFromNodeOrSibling(node, secondary)
  );
}

/** Deepest text node inside `node` (for element-bounded selections). */
function deepestTextNode(node: Node | null): Node | null {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) return node;
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    for (let i = 0; i < el.childNodes.length; i++) {
      const found = deepestTextNode(el.childNodes[i]);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Resolve the DOM node at a range boundary. Browsers often anchor multi-verse
 * selections on the wrapping `<p>` with child offsets instead of text nodes.
 */
export function nodeAtRangeBoundary(
  range: Range,
  which: "start" | "end",
): Node {
  const container =
    which === "start" ? range.startContainer : range.endContainer;
  const offset = which === "start" ? range.startOffset : range.endOffset;
  if (container.nodeType === Node.TEXT_NODE) return container;

  const el = container as Element;
  if (which === "start") {
    if (offset < el.childNodes.length) {
      const child = el.childNodes[offset];
      return deepestTextNode(child) ?? child ?? container;
    }
    if (offset > 0) {
      const child = el.childNodes[offset - 1];
      return deepestTextNode(child) ?? child ?? container;
    }
  } else {
    if (offset > 0) {
      const child = el.childNodes[offset - 1];
      return deepestTextNode(child) ?? child ?? container;
    }
    if (offset < el.childNodes.length) {
      const child = el.childNodes[offset];
      return deepestTextNode(child) ?? child ?? container;
    }
  }
  return container;
}

export function getReadingAreaFromRange(range: Range): HTMLElement | null {
  const node = range.commonAncestorContainer;
  const el = node instanceof HTMLElement ? node : node.parentElement;
  return el?.closest("[data-reading-area]") ?? null;
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
  try {
    r.setEnd(container, offset);
  } catch {
    return container.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_CONTAINS
      ? 0
      : (body.textContent?.length ?? 0);
  }
  const len = body.textContent?.length ?? 0;
  return Math.max(0, Math.min(r.toString().length, len));
}

function constrainRangeToBody(range: Range, body: HTMLElement): Range {
  const bodyRange = document.createRange();
  bodyRange.selectNodeContents(body);
  const out = range.cloneRange();
  if (out.compareBoundaryPoints(Range.START_TO_START, bodyRange) < 0) {
    out.setStart(bodyRange.startContainer, bodyRange.startOffset);
  }
  if (out.compareBoundaryPoints(Range.END_TO_END, bodyRange) > 0) {
    out.setEnd(bodyRange.endContainer, bodyRange.endOffset);
  }
  return out;
}

function offsetAtRangeBoundaryInBody(
  body: HTMLElement,
  range: Range,
  which: "start" | "end",
): number {
  const sub = constrainRangeToBody(range, body);
  const measure = document.createRange();
  measure.selectNodeContents(body);
  if (which === "start") {
    measure.setEnd(sub.startContainer, sub.startOffset);
  } else {
    measure.setEnd(sub.endContainer, sub.endOffset);
  }
  const len = body.textContent?.length ?? 0;
  return Math.max(0, Math.min(measure.toString().length, len));
}

function rangeTouchesVerse(range: Range, body: HTMLElement): boolean {
  const bodyRange = document.createRange();
  bodyRange.selectNodeContents(body);
  return (
    range.compareBoundaryPoints(Range.END_TO_START, bodyRange) > 0 &&
    range.compareBoundaryPoints(Range.START_TO_END, bodyRange) < 0
  );
}

/** Union of client rects for toolbar placement (matches SelectionPencilOverlay). */
export function selectionRectFromRange(
  range: Range,
): { left: number; top: number; right: number; bottom: number } | null {
  const clientRects =
    typeof range.getClientRects === "function"
      ? range.getClientRects()
      : null;
  const rects = clientRects
    ? Array.from(clientRects).filter((r) => r.width > 0 && r.height > 0)
    : [];
  if (rects.length > 0) {
    return {
      left: Math.min(...rects.map((r) => r.left)),
      top: Math.min(...rects.map((r) => r.top)),
      right: Math.max(...rects.map((r) => r.right)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
    };
  }
  if (typeof range.getBoundingClientRect !== "function") return null;
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

/** All verse numbers whose body intersects `range` within the reading column. */
export function versesIntersectingRange(
  range: Range,
  verseLengths: Map<number, number>,
): number[] {
  const readingArea = getReadingAreaFromRange(range);
  if (!readingArea) return [];

  const touched: number[] = [];
  for (const v of verseLengths.keys()) {
    const body = getVerseBodyElement(v, readingArea);
    if (body && rangeTouchesVerse(range, body)) touched.push(v);
  }
  return touched.sort((a, b) => a - b);
}

/**
 * Best-effort verse list when boundary resolution fails (e.g. whitespace
 * between `<span data-verse>` nodes in a single paragraph).
 */
export function versesFromRangeFallback(
  range: Range,
  verseLengths: Map<number, number>,
): number[] {
  const touched = versesIntersectingRange(range, verseLengths);
  if (touched.length > 0) return touched;

  const start = findVerseFromRangeBoundary(range, "start");
  const end = findVerseFromRangeBoundary(range, "end");
  if (start != null && end != null) {
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    const out: number[] = [];
    for (let v = lo; v <= hi; v++) {
      if (verseLengths.has(v)) out.push(v);
    }
    return out;
  }

  const ancestor = range.commonAncestorContainer;
  const fromAncestor = findVerseFromNode(ancestor);
  if (fromAncestor != null && verseLengths.has(fromAncestor)) {
    return [fromAncestor];
  }

  return [];
}

/**
 * Turn a live DOM selection into per-verse character ranges (plain text indices).
 */
export function selectionToVerseRanges(
  range: Range,
  verseLengths: Map<number, number>,
): VerseRange[] | null {
  const readingArea = getReadingAreaFromRange(range);
  if (!readingArea) return null;

  const touched = versesIntersectingRange(range, verseLengths);
  let startVerse = findVerseFromRangeBoundary(range, "start");
  let endVerse = findVerseFromRangeBoundary(range, "end");
  if (startVerse == null && touched.length > 0) startVerse = touched[0];
  if (endVerse == null && touched.length > 0) {
    endVerse = touched[touched.length - 1];
  }
  if (startVerse == null || endVerse == null) return null;

  const lo = Math.min(startVerse, endVerse);
  const hi = Math.max(startVerse, endVerse);
  const out: VerseRange[] = [];

  for (let v = lo; v <= hi; v++) {
    const len = verseLengths.get(v);
    if (len == null) continue;
    const body = getVerseBodyElement(v, readingArea);
    if (!body || !rangeTouchesVerse(range, body)) continue;

    let start = 0;
    let end = len;

    if (v === startVerse) {
      start = offsetAtRangeBoundaryInBody(body, range, "start");
    }
    if (v === endVerse) {
      end = offsetAtRangeBoundaryInBody(body, range, "end");
    }

    start = Math.max(0, Math.min(start, len));
    end = Math.max(start, Math.min(end, len));
    if (end > start) out.push({ verse: v, start, end });
  }

  return out.length > 0 ? out : null;
}

export type ToolbarSelectionPayload = {
  rect: { left: number; top: number; right: number; bottom: number };
  verses: number[];
  ranges: VerseRange[];
};

/**
 * Build toolbar state from a live DOM range. Shows the toolbar whenever the
 * selection is in the reading column and has geometry — even if partial
 * character ranges could not be computed (full-verse marks still apply).
 */
export function toolbarSelectionFromRange(
  range: Range,
  verseLengths: Map<number, number>,
): ToolbarSelectionPayload | null {
  if (!isRangeInReadingArea(range)) return null;
  const rect = selectionRectFromRange(range);
  if (!rect) return null;

  const ranges = selectionToVerseRanges(range, verseLengths);
  if (ranges && ranges.length > 0) {
    const verses = [...new Set(ranges.map((r) => r.verse))].sort((a, b) => a - b);
    return { rect, verses, ranges };
  }

  const verses = versesFromRangeFallback(range, verseLengths);
  if (verses.length === 0) return null;
  return { rect, verses, ranges: [] };
}

export function isRangeInReadingArea(range: Range): boolean {
  return !!getReadingAreaFromRange(range);
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
