import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  loadBestLocalReaderInk,
  saveLocalReaderInk,
  listLocalInkFingerprintsForPage,
} from "@/lib/ink/localInkStore";
import { LS_READER_INK_MODE } from "@/lib/ink/layoutFingerprint";
import { denormalizeStrokes, normalizeStrokes } from "@/lib/ink/strokeCoords";
import type { InkStroke, ReaderPageInkKey, StoredInkStroke } from "@/lib/ink/types";

type Options = {
  userId: string | undefined;
  pageKey: ReaderPageInkKey;
  layoutFingerprint: string;
  anchorVerse: number | null;
  canvasSize: { w: number; h: number };
  /** Live dimensions from layout — used when React state lags behind the canvas. */
  liveCanvasSizeRef?: RefObject<{ w: number; h: number }>;
  enabled: boolean;
};

function readCanvasSize(
  state: { w: number; h: number },
  liveRef?: RefObject<{ w: number; h: number }>,
) {
  const live = liveRef?.current;
  if (live && live.w > 0 && live.h > 0) return live;
  return state;
}

export function useReaderPageInk({
  userId,
  pageKey,
  layoutFingerprint,
  anchorVerse,
  canvasSize,
  liveCanvasSizeRef,
  enabled,
}: Options) {
  const [storedStrokes, setStoredStrokes] = useState<StoredInkStroke[]>([]);
  const [redoStack, setRedoStack] = useState<StoredInkStroke[]>([]);
  const [loading, setLoading] = useState(false);
  const [staleFingerprint, setStaleFingerprint] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const storedRef = useRef(storedStrokes);
  storedRef.current = storedStrokes;
  const canvasSizeRef = useRef(canvasSize);
  canvasSizeRef.current = canvasSize;
  const lastCanvasSizeRef = useRef({ w: 0, h: 0 });
  const inkDirtyRef = useRef(false);

  useEffect(() => {
    inkDirtyRef.current = false;
  }, [pageKey.book, pageKey.chapter, pageKey.pageIndex, pageKey.side]);

  const strokes = useMemo(() => {
    const live = readCanvasSize(canvasSize, liveCanvasSizeRef);
    if (live.w > 0 && live.h > 0) lastCanvasSizeRef.current = live;
    const { w, h } =
      live.w > 0 && live.h > 0 ? live : lastCanvasSizeRef.current;
    if (w <= 0 || h <= 0) {
      if (storedStrokes.length === 0) return [];
      const { w: lw, h: lh } = lastCanvasSizeRef.current;
      if (lw <= 0 || lh <= 0) return [];
      return denormalizeStrokes(storedStrokes, lw, lh);
    }
    return denormalizeStrokes(storedStrokes, w, h);
  }, [storedStrokes, canvasSize.w, canvasSize.h, liveCanvasSizeRef]);

  const persistRemote = useCallback(
    async (next: StoredInkStroke[]) => {
      if (!userId) return;
      const row = {
        user_id: userId,
        book: pageKey.book,
        chapter: pageKey.chapter,
        page_index: pageKey.pageIndex,
        side: pageKey.side,
        layout_fingerprint: layoutFingerprint,
        anchor_verse: anchorVerse,
        strokes: next,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("reader_page_ink").upsert(row, {
        onConflict: "user_id,book,chapter,page_index,side,layout_fingerprint",
      });
    },
    [anchorVerse, layoutFingerprint, pageKey, userId],
  );

  const persistLocal = useCallback(
    (next: StoredInkStroke[]) => {
      saveLocalReaderInk(
        layoutFingerprint,
        pageKey.book,
        pageKey.chapter,
        pageKey.pageIndex,
        pageKey.side,
        next,
      );
    },
    [layoutFingerprint, pageKey],
  );

  const scheduleSave = useCallback(
    (next: StoredInkStroke[]) => {
      persistLocal(next);
      if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void persistRemote(next);
      }, 800);
    },
    [persistLocal, persistRemote],
  );

  const updateStored = useCallback(
    (updater: StoredInkStroke[] | ((prev: StoredInkStroke[]) => StoredInkStroke[])) => {
      setStoredStrokes((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        storedRef.current = next;
        inkDirtyRef.current = true;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  // Load ink when the page changes — not when layout fingerprint or canvas size changes.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setStaleFingerprint(null);

    (async () => {
      let local = loadBestLocalReaderInk(
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

        if (data?.strokes && Array.isArray(data.strokes) && data.strokes.length > 0) {
          local = data.strokes as StoredInkStroke[];
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

      const loadedFromDisk = loadBestLocalReaderInk(
        layoutFingerprint,
        pageKey.book,
        pageKey.chapter,
        pageKey.pageIndex,
        pageKey.side,
      );
      const loaded = loadedFromDisk ?? local ?? [];

      setStoredStrokes((prev) => {
        const inMemory = storedRef.current;
        if (inkDirtyRef.current) {
          return inMemory.length > 0 ? inMemory : prev.length > 0 ? prev : loaded;
        }
        if (prev.length > 0) return prev;
        if (inMemory.length > 0) return inMemory;
        return loaded;
      });
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
  ]);

  // When typography/page size settles, migrate any blobs saved under older fingerprints.
  useEffect(() => {
    if (!enabled) return;

    const migrated = loadBestLocalReaderInk(
      layoutFingerprint,
      pageKey.book,
      pageKey.chapter,
      pageKey.pageIndex,
      pageKey.side,
    );

    if (storedRef.current.length > 0) {
      scheduleSave(storedRef.current);
      return;
    }

    if (!migrated?.length) return;

    setStoredStrokes((prev) => {
      if (inkDirtyRef.current && prev.length > 0) return prev;
      if (prev.length > 0) return prev;
      return migrated;
    });
  }, [
    enabled,
    layoutFingerprint,
    pageKey.book,
    pageKey.chapter,
    pageKey.pageIndex,
    pageKey.side,
    scheduleSave,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        void persistRemote(storedRef.current);
      }
    };
  }, [persistRemote]);

  const pushStroke = useCallback(
    (stroke: InkStroke) => {
      const { w, h } = readCanvasSize(canvasSizeRef.current, liveCanvasSizeRef);
      if (w <= 0 || h <= 0) return;
      const normalized = normalizeStrokes([stroke], w, h);
      if (normalized.length === 0) return;
      updateStored((prev) => [...prev, normalized[0]!]);
      setRedoStack([]);
    },
    [liveCanvasSizeRef, updateStored],
  );

  const undo = useCallback(() => {
    setStoredStrokes((prev) => {
      if (prev.length === 0) return prev;
      const popped = prev[prev.length - 1]!;
      setRedoStack((r) => [...r, popped]);
      const next = prev.slice(0, -1);
      storedRef.current = next;
      inkDirtyRef.current = true;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const redo = useCallback(() => {
    setRedoStack((redo) => {
      if (redo.length === 0) return redo;
      const stroke = redo[redo.length - 1]!;
      updateStored((prev) => [...prev, stroke]);
      return redo.slice(0, -1);
    });
  }, [updateStored]);

  const clearAll = useCallback(() => {
    updateStored([]);
    setRedoStack([]);
  }, [updateStored]);

  const setStrokes = useCallback(
    (updater: InkStroke[] | ((prev: InkStroke[]) => InkStroke[])) => {
      const { w, h } = readCanvasSize(canvasSizeRef.current, liveCanvasSizeRef);
      if (w <= 0 || h <= 0) return;
      setStoredStrokes((prev) => {
        const pixelPrev = denormalizeStrokes(prev, w, h);
        const pixelNext = typeof updater === "function" ? updater(pixelPrev) : updater;
        const next = normalizeStrokes(pixelNext, w, h);
        scheduleSave(next);
        return next;
      });
    },
    [liveCanvasSizeRef, scheduleSave],
  );

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
    setInkModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LS_READER_INK_MODE, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  return { inkMode, setInkMode, toggleInkMode };
}
