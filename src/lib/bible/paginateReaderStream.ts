import type { ReaderStreamUnit } from "./readerStream";

/** Validate a fixed prefix before remeasuring the current page and unread suffix. */
export function readerPaginationPrefix(length: number, prefix?: readonly number[]): number[] {
  if (!prefix?.length || prefix[0] !== 0 || prefix.at(-1)! > length) return [0];
  for (let i = 0; i < prefix.length; i++) {
    if (!Number.isInteger(prefix[i]) || prefix[i] < 0 || (i > 0 && prefix[i] <= prefix[i - 1])) return [0];
  }
  return [...prefix];
}

/** Measure text only. Artwork is an explicit, immutable single-page boundary. */
export function paginateReaderStream(
  stream: ReaderStreamUnit[],
  textFits: (start: number, end: number, pageIndex: number) => boolean,
  fixedPrefix?: readonly number[],
): number[] {
  const splits = readerPaginationPrefix(stream.length, fixedPrefix);
  let start = splits.at(-1)!;
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
    // A title never owns an empty text page. An irreducible unit is preserved;
    // the reader offers explicit continuous reading, never silently scrolls a page.
    const minimum = stream[start].kind === "chapter-header" && start + 1 < cap ? start + 2 : start + 1;
    start = Math.min(cap, Math.max(minimum, lastFit));
    splits.push(start);
  }
  return splits;
}
