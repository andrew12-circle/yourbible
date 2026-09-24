import type { ReaderStreamUnit } from "./readerStream";
import { validReaderPageBoundaries } from "./readerPageBoundaries";

/** Validate a fixed prefix before remeasuring the current page and unread suffix. */
export function readerPaginationPrefix(length: number, prefix?: readonly number[]): number[] {
  return prefix && validReaderPageBoundaries(prefix, length) ? [...prefix] : [0];
}

/**
 * Fill Scripture pages before placing artwork. Plates are anchors, not breaks.
 * textFits measures Scripture only, at the supplied physical page index.
 * A zero-width companion groups every illustration anchored to that text page
 * into one carousel without moving, omitting or repeating source text units.
 */
export function paginateReaderStream(
  stream: ReaderStreamUnit[],
  textFits: (start: number, end: number, pageIndex: number) => boolean,
  fixedPrefix?: readonly number[],
): number[] {
  const splits = readerPaginationPrefix(stream.length, fixedPrefix);
  // An illustration and its text are one layout decision. When only the
  // illustration is in an append/correction prefix, remeasure the pair; a
  // shorter text page might no longer contain that illustration's anchor.
  if (splits.length > 1 && splits.at(-1) === splits.at(-2)) splits.pop();
  const plateCounts = [0];
  for (const unit of stream) plateCounts.push(plateCounts.at(-1)! + Number(unit.kind === "plate"));
  const hasPlates = (start: number, end: number) => plateCounts[end] > plateCounts[start];

  const textEnd = (start: number, pageIndex: number): number => {
    let firstVerse = start;
    while (firstVerse < stream.length && stream[firstVerse].kind !== "verse") firstVerse++;
    if (firstVerse === stream.length) return stream.length;
    let lastFit = start, step = 1;
    while (start + step <= stream.length && textFits(start, start + step, pageIndex)) {
      lastFit = start + step;
      step *= 2;
    }
    let lo = lastFit + 1, hi = Math.min(start + step, stream.length);
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (textFits(start, mid, pageIndex)) { lastFit = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    // Keep trailing chapter headings and artwork anchors with their next verse,
    // not at the end of the previous page. Oversized first words still advance.
    while (lastFit > firstVerse + 1 && stream[lastFit - 1].kind !== "verse") lastFit--;
    return Math.max(firstVerse + 1, lastFit);
  };

  let start = splits.at(-1)!;
  while (start < stream.length) {
    const pageIndex = splits.length - 1;
    if (hasPlates(start, stream.length)) {
      const end = textEnd(start, pageIndex + 1);
      const hasText = stream.slice(start, end).some(unit => unit.kind === "verse");
      if (hasText && hasPlates(start, end)) {
        splits.push(start, end);
        start = end;
        continue;
      }
    }
    start = textEnd(start, pageIndex);
    splits.push(start);
  }
  return splits;
}
