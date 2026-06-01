import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadLocalReaderInk, saveLocalReaderInk, listLocalInkFingerprintsForPage } from "@/lib/ink/localInkStore";
import { LS_READER_INK_MODE } from "@/lib/ink/layoutFingerprint";
import { denormalizeStrokes, normalizeStrokes } from "@/lib/ink/strokeCoords";
import type { InkStroke, ReaderPageInkKey } from "@/lib/ink/types";

type Options = {
  userId: string | undefined;
  pageKey: ReaderPageInkKey;
  layoutFingerprint: string;
  anchorVerse: number | null;
  canvasSize: { w: number; h: number };
  enabled: boolean;
};

export function useReaderPageInk({
  userId,
  pageKey,
  layoutFingerprint,
  anchorVerse,
  canvasSize,
  enabled,
}: Options) {
  const [strokes, setStrokesState] = useState<InkStroke[]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[]>([]);
  const [loading, setLoading] = useState(false);
  const [staleFingerprint, setStaleFingerprint] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const persist = useCallback(
    async (next: InkStroke[]) => {
      const { w, h } = canvasSize;
      if (w <= 0 || h <= 0) return;
      const normalized = normalizeStrokes(next, w, h);
      saveLocalReaderInk(
        layoutFingerprint,
        pageKey.book,
        pageKey.chapter,
        pageKey.pageIndex,
        pageKey.side,
        normalized,
      );
      if (!userId) return;
      const row = {
        user_id: userId,
        book: pageKey.book,
        chapter: pageKey.chapter,
        page_index: pageKey.pageIndex,
        side: pageKey.side,
        layout_fingerprint: layoutFingerprint,
        anchor_verse: anchorVerse,
        strokes: normalized,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("reader_page_ink").upsert(row, {
        onConflict: "user_id,book,chapter,page_index,side,layout_fingerprint",
      });
    },
    [anchorVerse, canvasSize, layoutFingerprint, pageKey, userId],
  );

  const scheduleSave = useCallback(
    (next: InkStroke[]) => {
      if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void persist(next);
      }, 800);
    },
    [persist],
  );

  const setStrokes = useCallback(
    (updater: InkStroke[] | ((prev: InkStroke[]) => InkStroke[])) => {
      setStrokesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setStaleFingerprint(null);

    (async () => {
      const { w, h } = canvasSize;
      let local = loadLocalReaderInk(
        layoutFingerprint,
        pageKey.book,
        pageKey.chapter,
        pageKey.pageIndex,
        pageKey.side,
      );

      if (userId) {
        const { data } = await supabase
          .from("reader_page_ink")
          .select("strokes, layout_fingerprint, updated_at")
          .eq("user_id", userId)
          .eq("book", pageKey.book)
          .eq("chapter", pageKey.chapter)
          .eq("page_index", pageKey.pageIndex)
          .eq("side", pageKey.side)
          .eq("layout_fingerprint", layoutFingerprint)
          .maybeSingle();

        if (data?.strokes && Array.isArray(data.strokes)) {
          local = data.strokes as typeof local;
        } else if (!local) {
          const { data: legacy } = await supabase
            .from("reader_page_ink")
            .select("strokes, layout_fingerprint")
            .eq("user_id", userId)
            .eq("book", pageKey.book)
            .eq("chapter", pageKey.chapter)
            .eq("page_index", pageKey.pageIndex)
            .eq("side", pageKey.side)
            .neq("layout_fingerprint", layoutFingerprint)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (legacy?.layout_fingerprint) {
            setStaleFingerprint(legacy.layout_fingerprint);
          }
        }
      }

      if (!local) {
        const localFps = listLocalInkFingerprintsForPage(
          pageKey.book,
          pageKey.chapter,
          pageKey.pageIndex,
          pageKey.side,
        ).filter((fp) => fp !== layoutFingerprint);
        if (localFps.length > 0) {
          setStaleFingerprint(localFps[0]);
        }
      }

      if (cancelled) return;
      const denorm =
        local && w > 0 && h > 0 ? denormalizeStrokes(local, w, h) : [];
      setStrokesState(denorm);
      setRedoStack([]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    userId,
    pageKey.book,
    pageKey.chapter,
    pageKey.pageIndex,
    pageKey.side,
    layoutFingerprint,
    canvasSize.w,
    canvasSize.h,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        void persist(strokesRef.current);
      }
    };
  }, [persist]);

  const pushStroke = useCallback(
    (stroke: InkStroke) => {
      setStrokes((prev) => [...prev, stroke]);
      setRedoStack([]);
    },
    [setStrokes],
  );

  const undo = useCallback(() => {
    setStrokesState((prev) => {
      if (prev.length === 0) return prev;
      const popped = prev[prev.length - 1];
      setRedoStack((r) => [...r, popped]);
      const next = prev.slice(0, -1);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const redo = useCallback(() => {
    setRedoStack((redo) => {
      if (redo.length === 0) return redo;
      const stroke = redo[redo.length - 1];
      setStrokes((prev) => [...prev, stroke]);
      return redo.slice(0, -1);
    });
  }, [setStrokes]);

  const clearAll = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
  }, [setStrokes]);

  return {
    strokes,
    redoStack,
    loading,
    staleFingerprint,
    pushStroke,
    undo,
    redo,
    clearAll,
    setStrokes,
  };
}

export function useReaderInkMode(defaultOn = false) {
  const [inkMode, setInkModeState] = useState(() => {
    try {
      return localStorage.getItem(LS_READER_INK_MODE) === "1";
    } catch {
      return defaultOn;
    }
  });

  const setInkMode = useCallback((next: boolean) => {
    setInkModeState(next);
    try {
      localStorage.setItem(LS_READER_INK_MODE, next ? "1" : "0");
    } catch {
      /* noop */
    }
  }, []);

  const toggleInkMode = useCallback(() => {
    setInkMode(!inkMode);
  }, [inkMode, setInkMode]);

  return { inkMode, setInkMode, toggleInkMode };
}
