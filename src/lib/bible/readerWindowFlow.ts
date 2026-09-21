import { getNextChapterRef, getPrevChapterRef } from "./chapterNav";
import type { ReaderStreamUnit } from "./readerStream";

/** Reading-window state carries identities, never copies of Scripture or user notes. */
export interface ReaderWindowFlow {
  bibleId: string;
  bookAbbr: string;
  chapter: number;
  startId?: string;
  endId?: string;
  restoreId?: string;
  firstPageNumber: number;
  back?: ReaderWindowFlow;
  forward?: ReaderWindowFlow;
}
export function readerStreamUnitId(unit: ReaderStreamUnit): string {
  const prefix = `${unit.bookAbbr}|${unit.chapter}`;
  return unit.kind === "verse" ? `${prefix}|v${unit.verse.number}`
    : unit.kind === "plate" ? `${prefix}|art:${unit.plate.id}` : `${prefix}|heading`;
}
export function readReaderWindowFlow(state: unknown, bibleId: string, bookAbbr: string, chapter: number): ReaderWindowFlow | undefined {
  if (!state || typeof state !== "object" || !("readerWindowFlow" in state)) return;
  const flow = state.readerWindowFlow as ReaderWindowFlow | undefined;
  if (!flow || flow.bibleId !== bibleId || flow.bookAbbr !== bookAbbr || flow.chapter !== chapter
    || !Number.isInteger(flow.firstPageNumber) || flow.firstPageNumber < 1) return;
  for (const id of [flow.startId, flow.endId, flow.restoreId]) if (id != null && typeof id !== "string") return;
  return flow;
}
/** Both the paginator and live pages receive this same exact reading window. */
export function readerWindowStream(stream: ReaderStreamUnit[], flow?: ReaderWindowFlow): ReaderStreamUnit[] {
  if (!flow?.startId && !flow?.endId) return stream;
  const start = flow.startId ? stream.findIndex((unit) => flow.startId!.endsWith("|start")
    ? `${unit.bookAbbr}|${unit.chapter}|start` === flow.startId
    : readerStreamUnitId(unit) === flow.startId) : 0;
  const end = flow.endId ? stream.findIndex((unit) => readerStreamUnitId(unit) === flow.endId) : stream.length;
  // Wait for the matching window rather than silently displaying old text.
  return start >= 0 && end > start ? stream.slice(start, end) : [];
}

export interface ReaderWindowTurnOptions {
  bibleId: string; bookAbbr: string; chapter: number;
  stream: ReaderStreamUnit[]; splits: number[]; page: number; pagesPerTurn: number;
  delta: number; firstPageNumber: number; flow?: ReaderWindowFlow;
}
export type ReaderWindowTurn = { bookAbbr: string; chapter: number; flow: ReaderWindowFlow; enterAtEnd?: boolean };
/** Extend BEFORE showing a partial final spread, carrying its first unread unit. */
export function readerWindowTurn(options: ReaderWindowTurnOptions): ReaderWindowTurn | null {
  const { bibleId, bookAbbr, chapter, stream, splits, page, pagesPerTurn, delta, firstPageNumber, flow } = options;
  if (!stream.length || !delta) return null;
  const nextPage = page + (delta < 0 ? -pagesPerTurn : pagesPerTurn);
  const pageCount = splits.length - 1;
  const currentStart = stream[splits[page] ?? 0];
  const frame: ReaderWindowFlow = { ...flow, bibleId, bookAbbr, chapter, firstPageNumber,
    restoreId: readerStreamUnitId(currentStart) };
  if (delta < 0 && nextPage < 0) {
    if (flow?.back) return { bookAbbr: flow.back.bookAbbr, chapter: flow.back.chapter, flow: flow.back };
    const edge = stream[0];
    const previous = getPrevChapterRef(edge.bookAbbr, edge.chapter);
    if (!previous) return null;
    return { bookAbbr: previous.book.abbr, chapter: previous.chapter, enterAtEnd: true,
      flow: { bibleId, bookAbbr: previous.book.abbr, chapter: previous.chapter,
        endId: readerStreamUnitId(edge), firstPageNumber, forward: frame } };
  }
  if (delta <= 0 || nextPage + pagesPerTurn < pageCount) return null;
  if (nextPage >= pageCount && flow?.forward) {
    return { bookAbbr: flow.forward.bookAbbr, chapter: flow.forward.chapter, flow: flow.forward };
  }
  const edge = stream.at(-1)!;
  const following = getNextChapterRef(edge.bookAbbr, edge.chapter);
  if (!following || flow?.endId) return null;
  const unread = stream[splits[nextPage]];
  // Shift the three-chapter window by one, not beyond the whole next chapter.
  // Include its unfinished tail at the left, then fill across the new chapter.
  const target = unread ? { bookAbbr: edge.bookAbbr, chapter: edge.chapter }
    : { bookAbbr: following.book.abbr, chapter: following.chapter };
  // A failed/missing adjacent chapter must not create a same-route retry loop.
  if (unread && target.bookAbbr === bookAbbr && target.chapter === chapter) return null;
  return { ...target, flow: { bibleId, ...target, firstPageNumber: firstPageNumber + nextPage,
    startId: unread ? readerStreamUnitId(unread) : `${target.bookAbbr}|${target.chapter}|start`, back: frame } };
}
