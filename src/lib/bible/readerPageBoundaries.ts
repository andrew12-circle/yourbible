/**
 * Page cuts refer to the unchanged source stream. A repeated cut is an
 * illustration companion: [start, start, textEnd] means artwork, then text.
 * It consumes no Scripture; its carousel uses the following text page's anchors.
 * Never repeat a cut twice or finish a document with an empty companion.
 */
export function validReaderPageBoundaries(
  splits: readonly number[],
  streamLength: number,
  complete = false,
): boolean {
  if (!Number.isInteger(streamLength) || streamLength < 0 || !splits.length || splits[0] !== 0) return false;
  for (let i = 0; i < splits.length; i++) {
    const cut = splits[i];
    if (!Number.isInteger(cut) || cut < 0 || cut > streamLength) return false;
    if (i > 0 && cut < splits[i - 1]) return false;
    if (i > 1 && cut === splits[i - 1] && cut === splits[i - 2]) return false;
  }
  if (!complete) return true;
  if (streamLength === 0) return splits.length === 1;
  return splits.length >= 2 && splits.at(-1) === streamLength && splits.at(-2)! < streamLength;
}

export function readerIllustrationSourceRange(
  splits: readonly number[],
  pageIdx: number,
): { start: number; end: number } | null {
  if (!Number.isInteger(pageIdx) || pageIdx < 0) return null;
  const start = splits[pageIdx], end = splits[pageIdx + 1], textEnd = splits[pageIdx + 2];
  return start != null && end === start && textEnd != null && textEnd > start
    ? { start, end: textEnd }
    : null;
}
