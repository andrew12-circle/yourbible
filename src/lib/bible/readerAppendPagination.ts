import type { ReaderChapterPassage, ReaderStreamUnit } from "./readerStream";
import { isStreamSplitsReady } from "./readerStream";
import { readerStreamUnitId } from "./readerWindowFlow";

export interface ReaderAppendPaginationSnapshot {
  layoutKey: string;
  chapters: ReaderChapterPassage[];
  stream: ReaderStreamUnit[];
  splits: number[];
}

/** Appending chapters must not re-cut pages the reader already read.
 * Refill only the old final (possibly partial) page and the new suffix.
 * A real layout, source-text, artwork or window change still needs fresh cuts.
 */
export function readerAppendedPagePrefix(
  previous: ReaderAppendPaginationSnapshot | null,
  layoutKey: string,
  chapters: ReaderChapterPassage[],
  stream: ReaderStreamUnit[],
): number[] | undefined {
  if (!previous || previous.layoutKey !== layoutKey || stream.length <= previous.stream.length
    || !isStreamSplitsReady(previous.splits, previous.stream.length)
    || chapters.length <= previous.chapters.length) return;
  if (JSON.stringify(previous.chapters) !== JSON.stringify(chapters.slice(0, previous.chapters.length))) return;
  for (let i = 0; i < previous.stream.length; i++) {
    const before = previous.stream[i], after = stream[i];
    if (readerStreamUnitId(before) !== readerStreamUnitId(after)) return;
    if (before.kind === "verse" && after.kind === "verse"
      && before.verseRange?.end !== after.verseRange?.end) return;
    if (before.kind === "plate" && after.kind === "plate"
      && JSON.stringify(before.plate) !== JSON.stringify(after.plate)) return;
  }
  return previous.splits.slice(0, -1);
}
