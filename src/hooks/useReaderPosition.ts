import { useCallback, useLayoutEffect, useMemo, useState, type SetStateAction } from "react";
import type { PassageVerse } from "@/lib/bible/api";
import type { ReaderStreamUnit } from "@/lib/bible/readerStream";

export interface ReaderAnchor { id: string; bookAbbr: string; chapter: number; verse?: number }
export function readerUnitAnchor(unit: ReaderStreamUnit): ReaderAnchor {
  const prefix = `${unit.bookAbbr}|${unit.chapter}`;
  return { id: unit.kind === "verse" ? `${prefix}|v${unit.verse.number}` : unit.kind === "plate" ? `${prefix}|art:${unit.plate.id}` : `${prefix}|heading`, bookAbbr: unit.bookAbbr, chapter: unit.chapter, verse: unit.kind === "verse" ? unit.verse.number : undefined };
}
export function readerPageForUnit(splits: number[], index: number, spread: boolean): number {
  let page = 0;
  for (let i = 0; i < splits.length - 1; i++) {
    if (index >= splits[i] && index < splits[i + 1]) { page = i; break; }
  }
  return spread ? page - page % 2 : page;
}
interface Options {
  bibleId: string; bookAbbr: string; chapter: number; verses: PassageVerse[];
  stream: ReaderStreamUnit[]; useStream: boolean; splits: number[]; ready: boolean;
  spread: boolean; layoutKey: string; requestedVerse?: number; enterAtEnd?: boolean;
}
type Snapshot = { intent: string; layout: string; page: number; anchor: ReaderAnchor | null };

/** A Scripture/artwork identity survives reflow; a visual page number does not. */
export function useReaderPosition(options: Options) {
  const { bibleId, bookAbbr, chapter, verses, stream, useStream, splits, ready, spread, layoutKey, requestedVerse, enterAtEnd } = options;
  const units = useMemo<ReaderAnchor[]>(() => useStream ? stream.map(readerUnitAnchor) : verses.map((v) => ({ id: `${bookAbbr}|${chapter}|v${v.number}`, bookAbbr, chapter, verse: v.number })), [useStream, stream, verses, bookAbbr, chapter]);
  const intent = `${bibleId}|${bookAbbr}|${chapter}|${requestedVerse ?? ""}|${enterAtEnd ? "end" : "start"}`;
  const [snapshot, setSnapshot] = useState<Snapshot>({ intent: "", layout: "", page: 0, anchor: null });
  const maxPage = Math.max(0, splits.length - 2);
  const clamp = useCallback((page: number) => {
    const n = Math.max(0, Math.min(maxPage, page));
    return spread ? n - n % 2 : n;
  }, [maxPage, spread]);
  const indexForIntent = useCallback(() => {
    const inChapter = (unit: ReaderAnchor) => unit.bookAbbr === bookAbbr && unit.chapter === chapter;
    if (requestedVerse && requestedVerse > 0) {
      const exact = units.findIndex((u) => inChapter(u) && u.verse === requestedVerse);
      if (exact >= 0) return exact;
    }
    if (enterAtEnd) {
      for (let i = units.length - 1; i >= 0; i--) if (inChapter(units[i])) return i;
    }
    return Math.max(0, units.findIndex(inChapter));
  }, [units, bookAbbr, chapter, requestedVerse, enterAtEnd]);
  const anchorAtPage = useCallback((page: number) => {
    const start = splits[page] ?? 0;
    const end = splits[Math.min(page + (spread ? 2 : 1), splits.length - 1)] ?? units.length;
    const range = units.slice(start, end);
    return range.find((u) => !u.id.endsWith("|heading")) ?? range[0] ?? null;
  }, [splits, units, spread]);
  const page = useMemo(() => {
    if (!ready) return snapshot.intent === intent ? snapshot.page : 0;
    if (snapshot.intent !== intent) return readerPageForUnit(splits, indexForIntent(), spread);
    if (snapshot.layout !== layoutKey && snapshot.anchor) {
      const index = units.findIndex((u) => u.id === snapshot.anchor!.id);
      return readerPageForUnit(splits, index >= 0 ? index : indexForIntent(), spread);
    }
    return clamp(snapshot.page);
  }, [ready, snapshot, intent, splits, indexForIntent, spread, layoutKey, units, clamp]);
  const anchor = useMemo(() => {
    if (!ready) return snapshot.intent === intent ? snapshot.anchor : null;
    // Keep the exact logical anchor through repeated reflows. Replacing it with
    // each new page's first verse makes font-down/font-up cycles drift backwards.
    if (snapshot.intent === intent && snapshot.anchor) {
      const index = units.findIndex((unit) => unit.id === snapshot.anchor!.id);
      const start = splits[page] ?? 0;
      const end = splits[Math.min(page + (spread ? 2 : 1), splits.length - 1)] ?? units.length;
      if (index >= start && index < end) return snapshot.anchor;
    }
    return anchorAtPage(page);
  }, [ready, snapshot, intent, units, splits, page, spread, anchorAtPage]);
  useLayoutEffect(() => {
    if (!ready) return;
    setSnapshot((previous) => previous.intent === intent && previous.layout === layoutKey && previous.page === page && previous.anchor?.id === anchor?.id ? previous : { intent, layout: layoutKey, page, anchor });
  }, [ready, intent, layoutKey, page, anchor]);
  const setPage = useCallback((action: SetStateAction<number>) => {
    if (!ready) return;
    setSnapshot((previous) => {
      const current = previous.intent === intent && previous.layout === layoutKey ? previous.page : page;
      const next = clamp(typeof action === "function" ? action(current) : action);
      return { intent, layout: layoutKey, page: next, anchor: anchorAtPage(next) };
    });
  }, [ready, intent, layoutKey, page, clamp, anchorAtPage]);
  const goToVerse = useCallback((verse: number) => {
    const index = units.findIndex((u) => u.bookAbbr === bookAbbr && u.chapter === chapter && u.verse === verse);
    if (index >= 0) setPage(readerPageForUnit(splits, index, spread));
  }, [units, bookAbbr, chapter, splits, spread, setPage]);
  const goToStart = useCallback(() => {
    const index = units.findIndex((u) => u.bookAbbr === bookAbbr && u.chapter === chapter);
    if (index >= 0) setPage(readerPageForUnit(splits, index, spread));
  }, [units, bookAbbr, chapter, splits, spread, setPage]);
  return { page, setPage, anchor, goToVerse, goToStart };
}
