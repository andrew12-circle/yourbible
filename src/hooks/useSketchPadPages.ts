import { useCallback, useRef, useState } from "react";
import type { InkStroke } from "@/lib/ink/types";

export type SketchPadPage = {
  strokes: InkStroke[];
};

/**
 * Notebook-style pages for the handwritten sketch pad.
 * Strokes for the active page live in `activeStrokesRef` (same ref SketchPad already uses).
 */
export function useSketchPadPages(activeStrokesRef: React.MutableRefObject<InkStroke[]>) {
  const pagesRef = useRef<InkStroke[][]>([[]]);
  const pageIndexRef = useRef(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const syncActiveIntoPages = useCallback(() => {
    const pages = pagesRef.current;
    const idx = pageIndexRef.current;
    pages[idx] = activeStrokesRef.current;
  }, [activeStrokesRef]);

  const loadPage = useCallback(
    (index: number) => {
      const pages = pagesRef.current;
      const clamped = Math.max(0, Math.min(index, pages.length - 1));
      pageIndexRef.current = clamped;
      activeStrokesRef.current = pages[clamped] ?? [];
      setPageIndex(clamped);
      setPageCount(pages.length);
      return activeStrokesRef.current;
    },
    [activeStrokesRef],
  );

  const resetPages = useCallback(
    (pages: InkStroke[][] = [[]]) => {
      const next = pages.length > 0 ? pages.map((p) => [...p]) : [[]];
      pagesRef.current = next;
      pageIndexRef.current = 0;
      activeStrokesRef.current = next[0] ?? [];
      setPageIndex(0);
      setPageCount(next.length);
      return activeStrokesRef.current;
    },
    [activeStrokesRef],
  );

  const goToPage = useCallback(
    (index: number) => {
      syncActiveIntoPages();
      return loadPage(index);
    },
    [loadPage, syncActiveIntoPages],
  );

  const addPage = useCallback(() => {
    syncActiveIntoPages();
    pagesRef.current = [...pagesRef.current, []];
    return loadPage(pagesRef.current.length - 1);
  }, [loadPage, syncActiveIntoPages]);

  const snapshotPages = useCallback((): InkStroke[][] => {
    syncActiveIntoPages();
    return pagesRef.current.map((p) => [...p]);
  }, [syncActiveIntoPages]);

  const anyPageHasStrokes = useCallback(() => {
    syncActiveIntoPages();
    return pagesRef.current.some((p) => p.length > 0);
  }, [syncActiveIntoPages]);

  return {
    pageIndex,
    pageCount,
    pagesRef,
    pageIndexRef,
    syncActiveIntoPages,
    resetPages,
    goToPage,
    addPage,
    snapshotPages,
    anyPageHasStrokes,
  };
}
