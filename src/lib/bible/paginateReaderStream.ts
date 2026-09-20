import type { ReaderStreamUnit } from "./readerStream";

/** Measure text only. Artwork is an explicit, immutable single-page boundary. */
export function paginateReaderStream(
  stream: ReaderStreamUnit[],
  textFits: (start: number, end: number, pageIndex: number) => boolean,
): number[] {
  const splits = [0];
  let start = 0;
  while (start < stream.length) {
    if (stream[start].kind === "plate") {
      splits.push(++start);
      continue;
    }
    let cap = start + 1;
    while (cap < stream.length && stream[cap].kind !== "plate") cap += 1;
    const pageIndex = splits.length - 1;
    let lastFit = start;
    let step = 1;
    while (start + step <= cap && textFits(start, start + step, pageIndex)) {
      lastFit = start + step;
      step *= 2;
    }
    let lo = lastFit + 1;
    let hi = Math.min(start + step, cap);
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (textFits(start, mid, pageIndex)) { lastFit = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    // A title never owns an empty text page. Oversized text remains scrollable
    // through the reader's overflow recovery rather than being discarded.
    const minimum = stream[start].kind === "chapter-header" && start + 1 < cap ? start + 2 : start + 1;
    start = Math.min(cap, Math.max(minimum, lastFit));
    splits.push(start);
  }
  return splits;
}
