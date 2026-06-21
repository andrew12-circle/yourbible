import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_TOOLBAR_H,
  TOOLBAR_GAP,
  type ToolbarSelection,
} from "@/components/bible/SelectionToolbar";
import { toolbarSelectionFromRange } from "@/lib/bible/verseSelection";

export function useReaderToolbarSelection(
  verseLengths: Map<number, number>,
  inkMode: boolean,
) {
  const [tbSel, setTbSel] = useState<ToolbarSelection | null>(null);
  const tbSelRef = useRef<ToolbarSelection | null>(null);

  useEffect(() => {
    if (inkMode) {
      tbSelRef.current = null;
      setTbSel(null);
      window.getSelection()?.removeAllRanges();
      return;
    }

    let syncRaf: number | null = null;
    let selecting = false;

    const computeSelection = (): ToolbarSelection | null => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
      return toolbarSelectionFromRange(sel.getRangeAt(0), verseLengths);
    };

    const syncToolbar = () => {
      const next = computeSelection();
      if (!next) {
        if (selecting) return;
        return;
      }
      if (selecting) return;
      tbSelRef.current = next;
      setTbSel(next);
    };

    const scheduleSync = () => {
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
      syncRaf = requestAnimationFrame(() => {
        syncRaf = null;
        syncToolbar();
      });
    };

    const shouldIgnoreSelectionTarget = (target: EventTarget | null) =>
      (target as HTMLElement | null)?.closest(
        ".verse-num, [data-selection-toolbar], [data-page-footer]",
      );

    const isReadingAreaTarget = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest("[data-reading-area]") &&
      !shouldIgnoreSelectionTarget(target);

    const onSelectionStart = (e: Event) => {
      if (!isReadingAreaTarget(e.target)) return;
      selecting = true;
      tbSelRef.current = null;
      setTbSel(null);
    };

    const onSelectionEnd = (e: Event) => {
      selecting = false;
      if (shouldIgnoreSelectionTarget(e.target)) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(syncToolbar);
      });
    };

    document.addEventListener("selectionchange", scheduleSync);
    document.addEventListener("pointerdown", onSelectionStart);
    document.addEventListener("touchstart", onSelectionStart, { passive: true });
    document.addEventListener("pointerup", onSelectionEnd);
    document.addEventListener("touchend", onSelectionEnd, { passive: true });

    const dismissToolbarUnlessToolbar = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-selection-toolbar], [data-reading-area], .verse-num")) return;
      tbSelRef.current = null;
      setTbSel(null);
    };
    document.addEventListener("pointerdown", dismissToolbarUnlessToolbar);

    return () => {
      document.removeEventListener("selectionchange", scheduleSync);
      document.removeEventListener("pointerdown", onSelectionStart);
      document.removeEventListener("touchstart", onSelectionStart);
      document.removeEventListener("pointerdown", dismissToolbarUnlessToolbar);
      document.removeEventListener("pointerup", onSelectionEnd);
      document.removeEventListener("touchend", onSelectionEnd);
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
    };
  }, [verseLengths, inkMode]);

  useEffect(() => {
    if (!tbSel) return;
    const docked = window.innerWidth < 768;
    const toolbarH = DEFAULT_TOOLBAR_H;
    const margin = 16;
    const vh = window.innerHeight;
    const r = tbSel.rect;
    if (docked) {
      const dockTop = vh - margin - toolbarH;
      if (r.bottom + TOOLBAR_GAP > dockTop) {
        const delta = r.bottom + TOOLBAR_GAP - dockTop + 8;
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
    } else if (r.top - TOOLBAR_GAP - toolbarH < margin) {
      window.scrollBy({ top: r.top - TOOLBAR_GAP - toolbarH - margin - 8, behavior: "smooth" });
    }
  }, [tbSel]);

  const pinnedSelection = (): ToolbarSelection | null => tbSelRef.current ?? tbSel;

  const clearWindowSelection = () => {
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    tbSelRef.current = null;
    setTbSel(null);
  };

  return { tbSel, setTbSel, tbSelRef, pinnedSelection, clearWindowSelection };
}
