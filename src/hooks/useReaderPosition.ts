import { readerStreamUnitId } from "@/lib/bible/readerWindowFlow";
import { readerIllustrationSourceRange } from "@/lib/bible/readerPageBoundaries";
import { useCallback, useLayoutEffect, useMemo, useState, type SetStateAction } from "react";
import type { PassageVerse } from "@/lib/bible/api";
import type { ReaderStreamUnit } from "@/lib/bible/readerStream";

export interface ReaderAnchor { id: string; bookAbbr: string; chapter: number; verse?: number }
export function readerUnitAnchor(unit: ReaderStreamUnit): ReaderAnchor {
  return { id: readerStreamUnitId(unit), bookAbbr: unit.bookAbbr, chapter: unit.chapter, verse: unit.kind === "verse" ? unit.verse.number : undefined };
}
export function readerPageForUnit(splits: number[], index: number, spread: boolean, preferIllustration = false): number {
  let page = 0;
  for (let i = 0; i < splits.length - 1; i++) {
    const illustration = preferIllustration ? readerIllustrationSourceRange(splits, i) : null;
    if ((illustration && index >= illustration.start && index < illustration.end)
      || (index >= splits[i] && index < splits[i + 1])) { page = i; break; }
  }
  return spread ? page - page % 2 : page;
}
interface Options {
  bibleId: string; bookAbbr: string; chapter: number; verses: PassageVerse[];
  stream: ReaderStreamUnit[]; useStream: boolean; splits: number[]; ready: boolean;
  spread: boolean; layoutKey: string; requestedVerse?: number; enterAtEnd?: boolean; requestedAnchorId?: string;
}
type Snapshot = { intent: string; layout: string; page: number; anchor: ReaderAnchor | null };

/** Store a Scripture/artwork identity; visual page indexes are layout-dependent. */
export function useReaderPosition(options: Options) {
  const { bibleId, bookAbbr, chapter, verses, stream, useStream, splits, ready, spread, layoutKey, requestedVerse, enterAtEnd, requestedAnchorId } = options;
  const units = useMemo<ReaderAnchor[]>(() => useStream ? stream.map(readerUnitAnchor) : verses.map((v) => ({ id: `${bookAbbr}|${chapter}|v${v.number}`, bookAbbr, chapter, verse: v.number })), [useStream, stream, verses, bookAbbr, chapter]);
  const intent = `${bibleId}|${bookAbbr}|${chapter}|${requestedVerse ?? ""}|${enterAtEnd ? "end" : "start"}|${requestedAnchorId ?? ""}`;
  const [snapshot, setSnapshot] = useState<Snapshot>({ intent: "", layout: "", page: 0, anchor: null });
  const maxPage = Math.max(0, splits.length - 2);
  const clamp = useCallback((page: number) => {
    const n = Math.max(0, Math.min(maxPage, page));
    return spread ? n - n % 2 : n;
  }, [maxPage, spread]);
  const indexForIntent = useCallback(() => {
    if (requestedAnchorId) {
      const exact = units.findIndex((unit) => unit.id === requestedAnchorId);
      if (exact >= 0) return exact;
    }
    const inChapter = (unit: ReaderAnchor) => unit.bookAbbr === bookAbbr && unit.chapter === chapter;
    if (requestedVerse && requestedVerse > 0) {
      const exact = units.findIndex((u) => inChapter(u) && u.verse === requestedVerse);
      if (exact >= 0) return exact;
    }
    if (enterAtEnd) {
      for (let i = units.length - 1; i >= 0; i--) if (inChapter(units[i])) return i;
    }
    return Math.max(0, units.findIndex(inChapter));
  }, [units, bookAbbr, chapter, requestedVerse, enterAtEnd, requestedAnchorId]);
  const anchorAtPage = useCallback((page: number) => {
    const illustration = !spread ? readerIllustrationSourceRange(splits, page) : null;
    const start = splits[page] ?? 0;
    const end = illustration?.end ?? splits[Math.min(page + (spread ? 2 : 1), splits.length - 1)] ?? units.length;
    const range = units.slice(start, end);
    if (illustration) return range.find(u => u.id.includes("|art:")) ?? range[0] ?? null;
    return range.find((u) => !u.id.endsWith("|heading")) ?? range[0] ?? null;
  }, [splits, units, spread]);
  const page = useMemo(() => {
    if (!ready) return snapshot.intent === intent ? snapshot.page : 0;
    if (snapshot.intent !== intent) {
      const preferIllustration = requestedAnchorId ? requestedAnchorId.includes("|art:") : !requestedVerse && !enterAtEnd;
      return readerPageForUnit(splits, indexForIntent(), spread, preferIllustration);
    }
    if (snapshot.layout !== layoutKey && snapshot.anchor) {
      const index = units.findIndex((u) => u.id === snapshot.anchor!.id);
      return readerPageForUnit(splits, index >= 0 ? index : indexForIntent(), spread, snapshot.anchor.id.includes("|art:"));
    }
    return clamp(snapshot.page);
  }, [ready, snapshot, intent, splits, indexForIntent, spread, layoutKey, units, clamp, requestedAnchorId, requestedVerse, enterAtEnd]);
  const anchor = useMemo(() => {
    if (!ready) return snapshot.intent === intent ? snapshot.anchor : null;
    if (snapshot.intent !== intent) {
      // Preserve an illustration identity on mobile so resize does not skip it.
      if (!spread && readerIllustrationSourceRange(splits, page)) return anchorAtPage(page);
      // A chapter opener on the right must not inherit the preceding chapter.
      return units[indexForIntent()] ?? null;
    }
    if (snapshot.anchor) {
      const index = units.findIndex((unit) => unit.id === snapshot.anchor!.id);
      const start = splits[page] ?? 0;
      const illustration = !spread ? readerIllustrationSourceRange(splits, page) : null;
      const end = illustration?.end ?? splits[Math.min(page + (spread ? 2 : 1), splits.length - 1)] ?? units.length;
      if (index >= start && index < end) return snapshot.anchor;
    }
    return anchorAtPage(page);
  }, [ready, snapshot, intent, units, splits, page, spread, anchorAtPage, indexForIntent]);
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
  const goToIndex = useCallback((index: number, preferIllustration = false) => {
    if (!ready || index < 0 || !units[index]) return;
    const next = readerPageForUnit(splits, index, spread, preferIllustration);
    const artwork = !spread && readerIllustrationSourceRange(splits, next);
    setSnapshot({ intent, layout: layoutKey, page: next, anchor: artwork ? anchorAtPage(next) : units[index] });
  }, [ready, units, intent, layoutKey, splits, spread, anchorAtPage]);
  const goToVerse = useCallback((verse: number) => {
    goToIndex(units.findIndex((u) => u.bookAbbr === bookAbbr && u.chapter === chapter && u.verse === verse));
  }, [units, bookAbbr, chapter, goToIndex]);
  const goToStart = useCallback(() => {
    goToIndex(units.findIndex((u) => u.bookAbbr === bookAbbr && u.chapter === chapter), true);
  }, [units, bookAbbr, chapter, goToIndex]);
  return { page, setPage, anchor, goToVerse, goToStart };
}
