import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { BOOKS, findBookByAbbr } from "@/data/books";
import { fetchPassage, listBibles, type BibleEntry, type Passage, type PassageVerse } from "@/lib/bible/api";
import { splitJesusSpeechForChapter, type Segment as JesusSegment } from "@/lib/bible/redLetter";
import { Ribbons, type RibbonData } from "@/components/bible/Ribbons";
import { VerseSheet } from "@/components/bible/VerseSheet";
import {
  SelectionToolbar,
  DEFAULT_TOOLBAR_H,
  TOOLBAR_GAP,
  type ToolbarSelection,
} from "@/components/bible/SelectionToolbar";
import { SelectionPencilOverlay } from "@/components/bible/SelectionPencilOverlay";
import { NoteDialog } from "@/components/bible/NoteDialog";
import { BookmarkDialog } from "@/components/bible/BookmarkDialog";
import { MarkerSvgFilter } from "@/components/bible/MarkerSvgFilter";
import { TopBar } from "@/components/bible/TopBar";
import { BookScene } from "@/components/bible/BookScene";
import { Paginator } from "@/components/bible/Paginator";
import { PageFlip } from "@/components/bible/PageFlip";
import { SwipePage } from "@/components/bible/SwipePage";
import { useChapterData, useBookmarks } from "@/hooks/useUserData";
import { getPalette } from "@/lib/bible/palettes";
import {
  highlightIntervalsForVerse,
  sliceTextByHighlights,
  toolbarSelectionFromRange,
} from "@/lib/bible/verseSelection";
import { useReaderSinglePage, useIsTabletPortrait } from "@/hooks/use-reader-layout";
import { ChevronLeft, ChevronRight, Loader2, NotebookPen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { CompanionPane } from "@/components/reader/CompanionPane";
import { useCompanion } from "@/lib/reader/companionStore";
import { supabase } from "@/integrations/supabase/client";
import ReaderInkLayer, {
  type ReaderInkLayerApi,
  type ReaderInkLayerState,
} from "@/components/bible/ReaderInkLayer";
import { ReaderInkToolbar } from "@/components/bible/ReaderInkToolbar";
import { useReaderInkMode } from "@/hooks/useReaderPageInk";
import { computeReaderLayoutFingerprint } from "@/lib/ink/layoutFingerprint";
import { INK_PEN_COLORS, INK_PEN_SIZES } from "@/lib/ink/strokeRender";
import type { InkTool } from "@/lib/ink/types";

const LS_BIBLE_KEY = "yb.bibleId";
const LS_FONT_SCALE_KEY = "yb.fontScale";
const LS_HIGHLIGHT_COLOR_KEY = "yb.highlightColor";
const PAGE_TYPO_BASE = "text-[14px] sm:text-[14.5px] leading-[1.5] ink-text";
function pageTypoClass(fontChoice: string | undefined) {
  if (fontChoice === "sans") return `font-sans ${PAGE_TYPO_BASE}`;
  if (fontChoice === "sf") {
    // Inline SF stack via font-system class added in index.css; fall back to
    // a plain class so the user clearly gets Apple's typeface here.
    return `font-system ${PAGE_TYPO_BASE}`;
  }
  return `font-scripture ${PAGE_TYPO_BASE}`;
}
// Single-column reading flow — feels like a natural book page on any screen.
const COLUMN_CLASS = "";

const PAGE_MARGIN_OUTER = "clamp(1.125rem, 4vmin, 2.25rem)";
/** Gutter toward spine / center — extra room on desktop spreads. */
const PAGE_MARGIN_GUTTER = "clamp(2.25rem, 8vmin, 4.5rem)";

function pageHorizontalPadding(
  side: "left" | "right",
  singlePage?: boolean,
): React.CSSProperties {
  if (singlePage) {
    return { paddingLeft: PAGE_MARGIN_OUTER, paddingRight: PAGE_MARGIN_GUTTER };
  }
  return side === "left"
    ? { paddingLeft: PAGE_MARGIN_OUTER, paddingRight: PAGE_MARGIN_GUTTER }
    : { paddingLeft: PAGE_MARGIN_GUTTER, paddingRight: PAGE_MARGIN_OUTER };
}

// Deterministic 1..10 stroke variant per verse so the same verse always
// renders with the same imperfect highlighter pass.
function markerVariant(book: string, chapter: number, verse: number): number {
  let h = 2166136261;
  const s = `${book}|${chapter}|${verse}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10) + 1;
}

export default function ReaderPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const params = useParams<{ book?: string; chapter?: string }>();
  const dailyToastShown = useRef(false);

  const book = useMemo(
    () => findBookByAbbr(params.book ?? "Jhn") ?? BOOKS.find(b => b.abbr === "Jhn")!,
    [params.book],
  );
  const chapter = Math.max(1, Math.min(book.chapters, parseInt(params.chapter ?? "1", 10) || 1));

  const [bibles, setBibles] = useState<BibleEntry[]>([]);
  const [bibleId, setBibleId] = useState<string>(() => localStorage.getItem(LS_BIBLE_KEY) ?? "");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loadingPassage, setLoadingPassage] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpenRequest, setSettingsOpenRequest] = useState(0);

  const [activeVerse, setActiveVerse] = useState<{ number: number; text: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tbSel, setTbSel] = useState<ToolbarSelection | null>(null);
  /** Pinned selection for toolbar actions — survives browser selection collapse on toolbar tap. */
  const tbSelRef = useRef<ToolbarSelection | null>(null);
  /** Default highlighter color for toolbar swatches. */
  const [activeHighlightColor, setActiveHighlightColor] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_HIGHLIGHT_COLOR_KEY) ?? "";
    } catch {
      return "";
    }
  });
  /** Last mark kind chosen from the selection toolbar. */
  const [_markTool, setMarkTool] = useState<"highlight" | "underline">("highlight");
  const [noteOpen, setNoteOpen] = useState<{ verse: number } | null>(null);
  const [bmDialog, setBmDialog] = useState<{ position: 1 | 2 | 3 } | null>(null);
  // Reading text-size scale (persisted). Clamp into a sane range.
  const [fontScale, setFontScale] = useState<number>(() => {
    const raw = parseFloat(localStorage.getItem(LS_FONT_SCALE_KEY) ?? "");
    return Number.isFinite(raw) ? Math.min(1.5, Math.max(0.85, raw)) : 1;
  });
  const updateFontScale = (next: number) => {
    const clamped = Math.min(1.5, Math.max(0.85, +next.toFixed(2)));
    setFontScale(clamped);
    localStorage.setItem(LS_FONT_SCALE_KEY, String(clamped));
  };

  const singlePage = useReaderSinglePage();
  const tabletPortrait = useIsTabletPortrait();
  const { inkMode, toggleInkMode } = useReaderInkMode();
  const [inkTool, setInkTool] = useState<InkTool>("fountain");
  const [inkColor, setInkColor] = useState(INK_PEN_COLORS[0].value);
  const [inkSize, setInkSize] = useState<number>(INK_PEN_SIZES[1]);
  const inkApisRef = useRef(new Map<string, ReaderInkLayerApi>());
  const [activeInkLayerId, setActiveInkLayerId] = useState<string | null>(null);
  const [inkToolbarState, setInkToolbarState] = useState({
    canUndo: false,
    canRedo: false,
    redoCount: 0,
  });
  const [inkToolbarCollapsed, setInkToolbarCollapsed] = useState(false);
  const [staleLayoutInk, setStaleLayoutInk] = useState(false);
  const inkAnchorRefs = useRef(new Map<string, HTMLDivElement>());

  const bindInkAnchor = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) inkAnchorRefs.current.set(id, el);
      else inkAnchorRefs.current.delete(id);
    },
    [],
  );

  // Persist last-read position so the home screen can offer "continue".
  useEffect(() => {
    try { localStorage.setItem("yb_last_read", `${book.abbr}/${chapter}`); } catch { /* ignore */ }
  }, [book.abbr, chapter]);

  // Total chapters across the canon → progress through the Bible
  const { progress, chaptersBefore, totalChapters: _totalChapters } = useMemo(() => {
    const total = BOOKS.reduce((s, b) => s + b.chapters, 0);
    let before = 0;
    for (const b of BOOKS) {
      if (b.abbr === book.abbr) break;
      before += b.chapters;
    }
    return {
      progress: Math.max(0, Math.min(1, (before + chapter - 1) / Math.max(1, total - 1))),
      chaptersBefore: before,
      totalChapters: total,
    };
  }, [book.abbr, chapter]);

  const { highlights, notes, setMark: _setMark, setMarks, setMarkRanges, upsertNote, deleteNote } =
    useChapterData(book.abbr, chapter);
  const { bookmarks, setBookmark } = useBookmarks();

  // Companion pane integration
  const openCompanion = useCompanion(s => s.openWith);
  const [anchorBelief, setAnchorBelief] = useState<{ id: string; statement: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    setAnchorBelief(null);
    supabase.from("belief_nodes")
      .select("id,statement")
      .eq("user_id", user.id)
      .eq("core_scope", `${book.abbr}-${chapter}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data && data[0]) setAnchorBelief(data[0]); });
  }, [user, book.abbr, chapter]);

  const buildScope = (verses: number[]) => {
    const text = (passage?.verses ?? [])
      .filter(v => verses.length === 0 || verses.includes(v.number))
      .map(v => `${v.number} ${v.text}`)
      .join(" ");
    return {
      book: book.abbr, bookName: book.name, chapter, verses,
      passageText: text.slice(0, 4000),
    };
  };

  // (long-press highlight removed — we now use native drag-selection)

  // ---- Load translations ----
  useEffect(() => {
    listBibles().then(list => {
      setBibles(list);
      if (!bibleId && list.length) {
        // Default translation preference: Christian Standard Bible first, then
        // common fallbacks if CSB isn't available in the API catalog.
        const pref = ["CSB", "KJV", "WEB", "ESV", "NIV", "NLT"];
        const byAbbr = (code: string) =>
          list.find(b => b.abbreviation.toUpperCase() === code);
        const byName = list.find(b =>
          /christian\s+standard\s+bible/i.test(b.name) ||
          /\bcsb\b/i.test(b.name),
        );
        const found =
          byName ??
          pref.map(byAbbr).find(Boolean) ??
          list[0];
        setBibleId(found.id);
        localStorage.setItem(LS_BIBLE_KEY, found.id);
      }
    }).catch(err => {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't load translations", description: "Check your API.Bible key." });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load passage ----
  useEffect(() => {
    if (!bibleId) return;
    let cancelled = false;
    setLoadingPassage(true);
    setPassage(null);
    fetchPassage(bibleId, book.abbr, chapter)
      .then(p => { if (!cancelled) setPassage(p); })
      .catch(err => { console.error(err); toast({ variant: "destructive", title: "Couldn't load passage", description: String(err.message ?? err) }); })
      .finally(() => { if (!cancelled) setLoadingPassage(false); });
    return () => { cancelled = true; };
  }, [bibleId, book.abbr, chapter]);

  // ---- Page measurement ----
  // We measure the *actual* rendered page article so pagination matches
  // exactly what the reader sees on any screen size. The page surface
  // registers itself via the ref callback below.
  const [pageBox, setPageBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const layoutFingerprint = useMemo(
    () =>
      computeReaderLayoutFingerprint({
        bibleId: bibleId || "default",
        fontScale,
        pageWidth: Math.max(180, pageBox.w),
        pageHeight: Math.max(180, pageBox.h),
        singlePage,
      }),
    [bibleId, fontScale, pageBox.w, pageBox.h, singlePage],
  );

  useEffect(() => {
    setStaleLayoutInk(false);
  }, [layoutFingerprint]);
  const articleRoRef = useRef<ResizeObserver | null>(null);
  const articleElRef = useRef<HTMLElement | null>(null);
  const flipLockUntil = useRef(0);
  const measureArticle = (el: HTMLElement | null) => {
    if (articleRoRef.current) {
      articleRoRef.current.disconnect();
      articleRoRef.current = null;
    }
    articleElRef.current = el;
    if (!el) return;
    const recompute = () => {
      if (performance.now() < flipLockUntil.current) return;
      const width = Math.round(el.clientWidth);
      const height = Math.round(el.clientHeight);
      setPageBox(prev =>
        prev.w === width && prev.h === height ? prev : { w: width, h: height },
      );
    };
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    articleRoRef.current = ro;
    recompute();
  };
  // Recompute on viewport changes too (orientation/resize/zoom).
  useEffect(() => {
    const onResize = () => {
      if (performance.now() < flipLockUntil.current) return;
      const el = articleElRef.current;
      if (!el) return;
      const width = Math.round(el.clientWidth);
      const height = Math.round(el.clientHeight);
      setPageBox(prev =>
        prev.w === width && prev.h === height ? prev : { w: width, h: height },
      );
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // ---- Pagination ----
  const [splits, setSplits] = useState<number[]>([0]);
  // Reset when chapter / size changes
  useEffect(() => { setSplits([0]); }, [book.abbr, chapter, pageBox.w, pageBox.h, singlePage, fontScale]);
  const verses = passage?.verses ?? [];
  const verseLengths = useMemo(() => {
    const m = new Map<number, number>();
    for (const v of verses) m.set(v.number, v.text.length);
    return m;
  }, [verses]);
  const highlightColor =
    activeHighlightColor ||
    getPalette(profile?.highlight_palette ?? "classic").colors[0]?.cssVar ||
    "--hl-amber";
  const totalPagesInChapter = Math.max(1, splits.length - 1);

  // Pre-compute red-letter segmentation for the whole chapter so multi-verse
  // quotes (an opener in v.5, closer in v.8) carry red text across verses.
  const redSegments = useMemo<Map<number, JesusSegment[]>>(
    () => splitJesusSpeechForChapter(book.abbr, chapter, verses),
    [book.abbr, chapter, verses],
  );

  // ---- Page cursor (which page within this chapter is showing) ----
  const [chapterPage, setChapterPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"forward" | "back">("forward");
  useEffect(() => { setChapterPage(0); }, [book.abbr, chapter, fontScale]);

  // Pending verse-jump: after the user picks a verse from the TopBar picker,
  // remember it so once the chapter (re)loads and pagination splits are known,
  // we can hop to the page that contains that verse.
  const [pendingVerse, setPendingVerse] = useState<number | null>(null);

  useEffect(() => {
    const v = parseInt(searchParams.get("v") ?? "", 10);
    if (v > 0) setPendingVerse(v);
  }, [book.abbr, chapter, searchParams]);

  useEffect(() => {
    if (dailyToastShown.current) return;
    const state = location.state as { dailyPrompt?: string; dailyReason?: string } | null;
    if (!state?.dailyPrompt) return;
    dailyToastShown.current = true;
    const desc = state.dailyReason
      ? `${state.dailyReason}\n\n${state.dailyPrompt}`
      : state.dailyPrompt;
    toast({ title: "Today's reflection", description: desc });
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (pendingVerse == null || splits.length <= 1) return;
    // splits[i] is the index of the first verse on page i. Find the largest i
    // such that splits[i] < pendingVerse (verses are 1-indexed, splits 0-indexed).
    let target = 0;
    for (let i = 0; i < splits.length; i++) {
      if (splits[i] < pendingVerse) target = i;
      else break;
    }
    // On desktop spreads, snap to an even page so the verse is on the spread.
    if (!singlePage && target % 2 === 1) target -= 1;
    setChapterPage(Math.max(0, target));
    setPendingVerse(null);
  }, [pendingVerse, splits, singlePage]);

  // For desktop spreads we show TWO consecutive pages: chapterPage and chapterPage+1.
  // For mobile we show only one. So advance by 1 (mobile) or 2 (desktop).
  const pagesPerTurn = singlePage ? 1 : 2;

  const goPage = (delta: number) => {
    flipLockUntil.current = performance.now() + 280;
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    tbSelRef.current = null;
    setTbSel(null);
    setFlipDirection(delta > 0 ? "forward" : "back");
    const next = chapterPage + delta * pagesPerTurn;
    if (next < 0) {
      // Previous chapter, last page
      const prevIdx = BOOKS.findIndex(b => b.abbr === book.abbr) - 1 < 0
        ? (book.abbr === BOOKS[0].abbr ? -1 : BOOKS.findIndex(b => b.abbr === book.abbr) - 1)
        : BOOKS.findIndex(b => b.abbr === book.abbr) - 1;
      if (chapter > 1) navigate(`/read/${book.abbr}/${chapter - 1}`);
      else if (prevIdx >= 0) navigate(`/read/${BOOKS[prevIdx].abbr}/${BOOKS[prevIdx].chapters}`);
    } else if (next >= totalPagesInChapter) {
      const nextIdx = BOOKS.findIndex(b => b.abbr === book.abbr) + 1;
      if (chapter < book.chapters) navigate(`/read/${book.abbr}/${chapter + 1}`);
      else if (nextIdx < BOOKS.length) navigate(`/read/${BOOKS[nextIdx].abbr}/1`);
    } else {
      setChapterPage(next);
    }
  };

  // ---- Verse interactions ----
  // Tapping a verse number opens the verse sheet. Selection of body text is
  // native — handled by the document-level `selectionchange` listener below.
  const onVerseNumberClick = (
    e: React.MouseEvent,
    v: { number: number; text: string },
  ) => {
    e.stopPropagation();
    setActiveVerse(v);
    setSheetOpen(true);
  };

  const noteFor = (n: number) => notes.find(x => x.verse === n);
  const hlsFor = (n: number) =>
    highlights.filter(x => x.verse === n && (x.kind ?? "highlight") === "highlight");
  const hlFor = (n: number) => hlsFor(n)[0];
  const ulFor = (n: number) =>
    highlights.find(x => x.verse === n && x.kind === "underline");

  const persistHighlightColor = (cssVar: string) => {
    setActiveHighlightColor(cssVar);
    try {
      localStorage.setItem(LS_HIGHLIGHT_COLOR_KEY, cssVar);
    } catch { /* ignore */ }
    setMarkTool("highlight");
  };

  // ---- Native text selection → toolbar (apply via toolbar actions only) ----
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
      // Do not gate on sel.toString() — iOS/Safari often report an empty string
      // while the user is still dragging handles or extending a touch selection.
      return toolbarSelectionFromRange(sel.getRangeAt(0), verseLengths);
    };

    const syncToolbar = () => {
      const next = computeSelection();
      if (!next) {
        // While the user is actively selecting, ignore transient collapsed /
        // empty-geometry frames so the toolbar doesn't flash away mid-drag.
        if (selecting) return;
        // Keep the pinned toolbar once shown — tapping a swatch clears the
        // browser selection before click (especially on touch, >120ms later).
        return;
      }
      // Defer showing the toolbar until pointer/touch release — selectionchange
      // fires continuously while the user is dragging.
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
      // Touch browsers may finalize selection geometry after touchend.
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
      document.removeEventListener("pointerup", onSelectionEnd);
      document.removeEventListener("touchend", onSelectionEnd);
      document.removeEventListener("pointerdown", dismissToolbarUnlessToolbar);
      if (syncRaf != null) cancelAnimationFrame(syncRaf);
    };
  }, [verseLengths, inkMode]);

  // Keep the selected text visible above a docked or floating toolbar.
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

  const mobileSide: "left" | "right" = chapterPage % 2 === 0 ? "left" : "right";
  const defaultInkLayerId = singlePage
    ? `${book.abbr}-${chapter}-${chapterPage}-${mobileSide}`
    : `${book.abbr}-${chapter}-${chapterPage}-left`;
  const focusedInkLayerId = activeInkLayerId ?? defaultInkLayerId;
  const focusedInkLayerIdRef = useRef(focusedInkLayerId);
  focusedInkLayerIdRef.current = focusedInkLayerId;

  const handleInkRegister = useCallback((id: string, api: ReaderInkLayerApi) => {
    inkApisRef.current.set(id, api);
  }, []);

  const handleInkUnregister = useCallback((id: string) => {
    inkApisRef.current.delete(id);
  }, []);

  const handleInkStateChange = useCallback((id: string, state: ReaderInkLayerState) => {
    if (id !== focusedInkLayerIdRef.current) return;
    setInkToolbarState((prev) =>
      prev.canUndo === state.canUndo &&
      prev.canRedo === state.canRedo &&
      prev.redoCount === state.redoCount
        ? prev
        : state,
    );
  }, []);

  const handleInkStaleLayout = useCallback((stale: boolean) => {
    if (stale) setStaleLayoutInk(true);
  }, []);

  const handleInkStrokeStart = useCallback(() => {
    setInkToolbarCollapsed(true);
  }, []);

  const runInkAction = useCallback(
    (action: "undo" | "redo" | "clear") => {
      const api = inkApisRef.current.get(focusedInkLayerIdRef.current);
      if (!api) return;
      if (action === "undo") api.undo();
      else if (action === "redo") api.redo();
      else api.clear();
      setInkToolbarState(api.getState());
    },
    [],
  );

  useEffect(() => {
    if (!inkMode) return;
    const api = inkApisRef.current.get(focusedInkLayerId);
    if (api) {
      setInkToolbarState((prev) => {
        const next = api.getState();
        return prev.canUndo === next.canUndo &&
          prev.canRedo === next.canRedo &&
          prev.redoCount === next.redoCount
          ? prev
          : next;
      });
    }
  }, [inkMode, focusedInkLayerId, chapterPage, book.abbr, chapter]);

  useEffect(() => {
    document.body.classList.toggle("reader-ink-mode", inkMode);
    return () => document.body.classList.remove("reader-ink-mode");
  }, [inkMode]);

  // Block native text selection while writing — especially on iOS Safari.
  useEffect(() => {
    if (!inkMode) return;

    const clearSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      sel.removeAllRanges();
    };

    const blockSelectStart = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-reader-ink-toolbar], [data-reader-ink-layer]")) return;
      if (t?.closest("[data-reading-area], [data-ink-anchor]")) {
        e.preventDefault();
      }
    };

    clearSelection();
    document.addEventListener("selectionchange", clearSelection);
    document.addEventListener("selectstart", blockSelectStart, true);
    return () => {
      document.removeEventListener("selectionchange", clearSelection);
      document.removeEventListener("selectstart", blockSelectStart, true);
      clearSelection();
    };
  }, [inkMode]);

  useEffect(() => {
    if (!inkMode) {
      setInkToolbarCollapsed(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (inkToolbarCollapsed) {
        toggleInkMode();
      } else {
        setInkToolbarCollapsed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inkMode, inkToolbarCollapsed, toggleInkMode]);

  const pinnedSelection = (): ToolbarSelection | null =>
    tbSelRef.current ?? tbSel;

  // Auth/onboarding gates must stay after every hook so hook order stays stable.
  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!loading && user && needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  const clearWindowSelection = () => {
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    tbSelRef.current = null;
    setTbSel(null);
  };

  const applyHighlightToSelection = async (cssVar: string) => {
    const sel = pinnedSelection();
    if (!sel || sel.verses.length === 0) return;
    persistHighlightColor(cssVar);
    try {
      if (sel.ranges.length > 0) {
        await setMarkRanges(sel.ranges, cssVar, "highlight", verseLengths);
      } else {
        await setMarks(sel.verses, cssVar, "highlight");
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Couldn't save highlight",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return;
    }
    clearWindowSelection();
  };
  const applyUnderlineToSelection = async () => {
    const sel = pinnedSelection();
    if (!sel) return;
    setMarkTool("underline");
    const allUnderlined = sel.verses.every(v => !!ulFor(v));
    try {
      await setMarks(sel.verses, allUnderlined ? null : "--leather", "underline");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Couldn't save underline",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return;
    }
    clearWindowSelection();
  };
  const clearMarksOnSelection = async () => {
    const sel = pinnedSelection();
    if (!sel) return;
    try {
      await Promise.all([
        setMarks(sel.verses, null, "highlight"),
        setMarks(sel.verses, null, "underline"),
      ]);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Couldn't clear mark",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return;
    }
    clearWindowSelection();
  };
  const noteOnSelection = () => {
    const sel = pinnedSelection();
    if (!sel) return;
    setNoteOpen({ verse: sel.verses[0] });
    clearWindowSelection();
  };
  const reference = `${book.name} ${chapter}`;

  // Header for first page of chapter
  const ChapterHeader = (
    <div className="text-center mb-6">
      <motion.h1
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-display text-2xl sm:text-3xl ink-text mb-1"
      >
        {book.name}
      </motion.h1>
      <div className="flex items-center justify-center gap-3 text-muted-foreground">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold/40" />
        <span className="font-display text-[11px] uppercase tracking-[0.3em]">Chapter {chapter}</span>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold/40" />
      </div>
    </div>
  );

  const renderVerse = (v: PassageVerse) => {
    const ul = ulFor(v.number);
    const note = noteFor(v.number);
    const segments =
      redSegments.get(v.number) ?? [{ text: v.text, isJesus: false }];
    const hlMarks = hlsFor(v.number);
    const intervals = highlightIntervalsForVerse(v.text.length, hlMarks);
    const textParts = sliceTextByHighlights(v.text, intervals);
    const mv = markerVariant(book.abbr, chapter, v.number);

    const segBounds: { start: number; end: number; seg: JesusSegment }[] = [];
    let acc = 0;
    for (const s of segments) {
      segBounds.push({ start: acc, end: acc + s.text.length, seg: s });
      acc += s.text.length;
    }

    const bodyNodes: React.ReactNode[] = [];
    let global = 0;
    for (let pi = 0; pi < textParts.length; pi++) {
      const part = textParts[pi];
      const pStart = global;
      const pEnd = global + part.text.length;
      global = pEnd;
      for (let si = 0; si < segBounds.length; si++) {
        const { start: sStart, end: sEnd, seg } = segBounds[si];
        const oStart = Math.max(pStart, sStart);
        const oEnd = Math.min(pEnd, sEnd);
        if (oEnd <= oStart) continue;
        const chunk = v.text.slice(oStart, oEnd);
        let inner: React.ReactNode = chunk;
        if (part.color) {
          inner = (
            <span
              className={`marker-hl v${mv}`}
              style={{ ["--hl-color" as string]: `var(${part.color})` }}
            >
              {chunk}
            </span>
          );
        }
        bodyNodes.push(
          seg.isJesus ? (
            <span key={`${pi}-${si}`} className="red-letter">
              {inner}
            </span>
          ) : (
            <span key={`${pi}-${si}`}>{inner}</span>
          ),
        );
      }
    }

    const bodyStyle: React.CSSProperties = ul
      ? { ["--ink-color" as string]: `var(${ul.color || "--leather"})` }
      : {};
    const wrappedBody = (
      <span
        data-verse-body={v.number}
        className={ul ? "pen-underline" : undefined}
        style={bodyStyle}
      >
        {bodyNodes}
      </span>
    );

    return (
      <span key={v.number} data-verse={v.number}>
        <button
          type="button"
          onClick={(e) => onVerseNumberClick(e, v)}
          className="verse-num bg-transparent border-0 p-0 m-0 cursor-pointer hover:text-leather transition-colors"
          aria-label={`Verse ${v.number}`}
          // The verse number itself is not selectable — keeps drag-selection
          // of body text from accidentally including the number.
          style={{ userSelect: "none" }}
        >
          {v.number}
        </button>
        {wrappedBody}
        {note && (
          <button
            onClick={(e) => { e.stopPropagation(); setNoteOpen({ verse: v.number }); }}
            className="inline-flex items-center align-middle ml-1 w-4 h-4 rounded-full bg-gold/20 text-gold-deep hover:bg-gold/40 transition-colors"
            aria-label="Open note"
            style={{ userSelect: "none" }}
          >
            <NotebookPen className="w-2.5 h-2.5 m-auto" />
          </button>
        )}
        {" "}
      </span>
    );
  };

  const openReaderSettings = () => setSettingsOpenRequest((n) => n + 1);

  // A single page surface (no scrolling — fixed area)
  const PageSurface = ({
    pageIdx,
    side,
  }: {
    pageIdx: number;
    side: "left" | "right";
  }) => {
    const isFirst = pageIdx === 0;
    const start = splits[pageIdx] ?? 0;
    const end = splits[pageIdx + 1] ?? verses.length;
    const slice = verses.slice(start, end);
    // Compute global page number across the canon (very approximate)
    const globalPage = chaptersBefore + chapter; // good enough for footer
    const inkLayerId = `${book.abbr}-${chapter}-${pageIdx}-${side}`;
    return (
      <div
        className={cn(
          "relative flex flex-col h-full min-h-0 overflow-hidden bg-paper pt-10 pb-2",
          inkMode && "reader-ink-active",
        )}
        style={pageHorizontalPadding(side, singlePage)}
      >
        <div
          className={`flex-shrink-0 ${
            singlePage || side === "left" ? "text-left" : "text-right"
          } ${inkMode ? "pointer-events-none" : ""}`}
        >
          <button
            type="button"
            onClick={openReaderSettings}
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium hover:text-muted-foreground transition-colors"
            aria-label={`${book.name} — open reader settings`}
          >
            {book.name}
          </button>
        </div>
        {isFirst && <div className="flex-shrink-0">{ChapterHeader}</div>}
        {loadingPassage ? (
          <div className="flex flex-1 justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-leather/60" />
          </div>
        ) : (
          <div
            ref={bindInkAnchor(inkLayerId)}
            data-ink-anchor={inkLayerId}
            className="relative flex flex-1 min-h-0 min-w-0"
          >
            <article
              ref={pageIdx === leftIdx && side === (singlePage ? mobileSide : "left") ? measureArticle : undefined}
              data-reading-area
              className={`h-full min-h-0 w-full overflow-hidden ${pageTypoClass(profile?.font_choice)} ${COLUMN_CLASS} ${
                inkMode ? "!select-none" : "selectable-text"
              }`}
              style={{ fontSize: `${fontScale}em` }}
            >
              <p className="text-justify hyphens-auto" style={{ orphans: 2, widows: 2 }}>
                {slice.map(renderVerse)}
              </p>
            </article>
          </div>
        )}
        {inkMode && !loadingPassage ? (
          <ReaderInkLayer
            layerId={inkLayerId}
            active
            getAnchorEl={() => inkAnchorRefs.current.get(inkLayerId) ?? null}
            userId={user?.id}
            pageKey={{ book: book.abbr, chapter, pageIndex: pageIdx, side }}
            layoutFingerprint={layoutFingerprint}
            anchorVerse={slice[0]?.number ?? null}
            tool={inkTool}
            color={inkColor}
            size={inkSize}
            onFocus={setActiveInkLayerId}
            onRegister={handleInkRegister}
            onUnregister={handleInkUnregister}
            onStateChange={handleInkStateChange}
            onStaleLayout={handleInkStaleLayout}
            onStrokeStart={handleInkStrokeStart}
          />
        ) : null}
        {!focusMode ? (
          <div
            data-page-footer
            className={cn(
              "flex-shrink-0 h-10 flex items-center justify-center gap-2 border-t border-border/25 text-[10px] text-muted-foreground/60 font-display tracking-widest",
              inkMode && "relative z-[21] pointer-events-none opacity-60",
            )}
          >
            <button
              onClick={() => goPage(-1)}
              aria-label="Previous page"
              className="p-0.5 rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={openReaderSettings}
                className="hover:text-muted-foreground transition-colors"
                aria-label={`${book.name} — open reader settings`}
              >
                {book.name}
              </button>
              <span aria-hidden>· p. {globalPage}</span>
            </span>
            <button
              onClick={() => goPage(1)}
              aria-label="Next page"
              className="p-0.5 rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  // Determine left & right page indices
  const leftIdx = chapterPage;
  const rightIdx = singlePage ? chapterPage : chapterPage + 1;

  return (
    <div
      className={`min-h-screen relative transition-all duration-700 ${
        focusMode ? "saturate-[0.88] contrast-[0.97] bg-paper/98" : ""
      }`}
    >
      <MarkerSvgFilter />

      <TopBar
        reference={reference}
        collapsed={false}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode(f => !f)}
        bibleId={bibleId}
        bibles={bibles}
        onChangeBible={(id) => { setBibleId(id); localStorage.setItem(LS_BIBLE_KEY, id); }}
        onBookmark={() => {
          const used = new Set(bookmarks.map(b => b.position));
          const free = ([1, 2, 3] as const).find(p => !used.has(p)) ?? 1;
          setBmDialog({ position: free });
        }}
        currentBook={book}
        currentChapter={chapter}
        currentVerseCount={verses.length}
        onJumpTo={(b, c, v) => {
          if (v && v > 0) setPendingVerse(v);
          if (b.abbr === book.abbr && c === chapter) {
            // Same chapter — just hop to the page containing the verse (if any)
            if (!v) setChapterPage(0);
          } else {
            navigate(`/read/${b.abbr}/${c}`);
          }
        }}
        fontScale={fontScale}
        onFontScaleChange={updateFontScale}
        singlePage={singlePage}
        settingsOpenRequest={settingsOpenRequest}
        inkMode={inkMode}
        onToggleInkMode={toggleInkMode}
      />

      {staleLayoutInk && inkMode ? (
        <div
          className="fixed left-1/2 top-[calc(var(--safe-area-inset-top)+3.5rem)] z-[34] max-w-md -translate-x-1/2 rounded-lg border border-amber-200/80 bg-amber-50/95 px-3 py-2 text-center text-xs text-amber-950 shadow-sm backdrop-blur-sm"
          role="status"
        >
          Layout changed — ink from your previous text size or page layout is hidden.
        </div>
      ) : null}

      {inkMode && !focusMode ? (
        <ReaderInkToolbar
          tool={inkTool}
          color={inkColor}
          size={inkSize}
          collapsed={inkToolbarCollapsed}
          onCollapsedChange={setInkToolbarCollapsed}
          hasStrokes={inkToolbarState.canUndo}
          redoCount={inkToolbarState.redoCount}
          tabletPortrait={tabletPortrait}
          onTool={setInkTool}
          onColor={setInkColor}
          onSize={setInkSize}
          onUndo={() => runInkAction("undo")}
          onRedo={() => runInkAction("redo")}
          onClear={() => runInkAction("clear")}
        />
      ) : null}

      <BookScene
        progress={progress}
        singlePage={singlePage}
        tabletPortrait={tabletPortrait}
        pageSide={mobileSide}
        ribbons={
          focusMode ? null : (
            <Ribbons
              ribbons={bookmarks as RibbonData[]}
              anchor={singlePage ? "spine" : "gutter"}
              swaying={false}
              onJump={(r) => navigate(`/read/${r.book}/${r.chapter}`)}
              onAddAt={(p) => setBmDialog({ position: p })}
            />
          )
        }
        leftPage={
          <SwipePage side="left" onTurn={goPage} inkMode={inkMode}>
            <PageFlip
              pageKey={`L-${book.abbr}-${chapter}-${leftIdx}`}
              direction={flipDirection}
              side="left"
            >
              <PageSurface pageIdx={leftIdx} side="left" />
            </PageFlip>
          </SwipePage>
        }
        rightPage={
          <SwipePage side={singlePage ? "left" : "right"} onTurn={goPage} inkMode={inkMode}>
            <PageFlip pageKey={`R-${book.abbr}-${chapter}-${rightIdx}`} direction={flipDirection} side={singlePage ? "left" : "right"}>
              <PageSurface pageIdx={rightIdx} side={singlePage ? "left" : "right"} />
            </PageFlip>
          </SwipePage>
        }
      />

      {/* Page-turn hot zones — narrow strips at the screen edge */}
      <button
        onClick={() => goPage(-1)}
        aria-label="Previous page"
        className={`fixed top-20 bottom-safe-16 left-0 w-8 z-[5] opacity-0 ${inkMode ? "pointer-events-none" : ""}`}
      />
      <button
        onClick={() => goPage(1)}
        aria-label="Next page"
        className={`fixed top-20 bottom-safe-16 right-0 w-8 z-[5] opacity-0 ${inkMode ? "pointer-events-none" : ""}`}
      />

      {/* Headless paginator — measures and reports splits */}
      {pageBox.w > 0 && pageBox.h > 0 && verses.length > 0 && (
        <Paginator
          verses={verses}
          bookAbbr={book.abbr}
          chapter={chapter}
          // pageBox is measured directly from the live page — width is the
          // real text column, height is from the article's top to the footer.
          pageWidth={Math.max(180, pageBox.w)}
          pageHeight={Math.max(180, pageBox.h)}
          className={pageTypoClass(profile?.font_choice)}
          columnsClassName={COLUMN_CLASS}
          header={ChapterHeader}
          footerHeight={0}
          fontSizeStyle={{ fontSize: `${fontScale}em` }}
          onSplitsChange={setSplits}
        />
      )}

      <AnimatePresence>
        {focusMode && !singlePage && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => setFocusMode(false)}
            className="fixed bottom-safe-16 left-1/2 -translate-x-1/2 z-30 bg-leather/90 text-paper text-xs px-4 py-2 rounded-full backdrop-blur shadow-md"
          >
            Secret Place — tap to leave
          </motion.button>
        )}
      </AnimatePresence>

      {activeVerse && (
        <VerseSheet
          open={sheetOpen} onOpenChange={setSheetOpen}
          reference={`${book.name} ${chapter}:${activeVerse.number}`}
          verseText={activeVerse.text}
        />
      )}

      {/* Live pencil underline that tracks the current text selection */}
      <SelectionPencilOverlay enabled={!inkMode} />

      {/* Toolbar that appears above the user's selection. Highlighter swatches,
          a pen for underlining, a note shortcut, and a clear control. */}
      <SelectionToolbar
        open={!!tbSel && !inkMode}
        paletteId={profile?.highlight_palette ?? "classic"}
        selection={tbSel}
        currentColor={tbSel ? hlFor(tbSel.verses[0])?.color ?? null : null}
        activeColor={highlightColor}
        currentlyUnderlined={
          !!tbSel && tbSel.verses.every(v => !!ulFor(v))
        }
        onPickHighlight={applyHighlightToSelection}
        onActiveColorChange={persistHighlightColor}
        onPickUnderline={applyUnderlineToSelection}
        onClear={clearMarksOnSelection}
        onNote={noteOnSelection}
        onTestFramework={() => {
          if (!tbSel) return;
          const text = verses
            .filter((v) => tbSel.verses.includes(v.number))
            .map((v) => `${v.number} ${v.text}`)
            .join(" ");
          const refRange =
            tbSel.verses.length > 1
              ? `${book.name} ${chapter}:${tbSel.verses[0]}-${tbSel.verses[tbSel.verses.length - 1]}`
              : `${book.name} ${chapter}:${tbSel.verses[0]}`;
          navigate(
            `/framework/artifacts/new?ref=${encodeURIComponent(refRange)}&verse=${encodeURIComponent(text)}`,
          );
        }}
        onOpenCompanion={() => {
          if (!tbSel) return;
          openCompanion(buildScope(tbSel.verses), "journal");
        }}
        onClose={() => clearWindowSelection()}
      />

      {noteOpen && (
        <NoteDialog
          open
          reference={`${book.name} ${chapter}:${noteOpen.verse}`}
          initialBody={noteFor(noteOpen.verse)?.body}
          onClose={() => setNoteOpen(null)}
          onSave={(body) => { upsertNote(noteOpen.verse, body); }}
          onDelete={noteFor(noteOpen.verse) ? () => deleteNote(noteOpen.verse) : undefined}
        />
      )}

      {bmDialog && (
        <BookmarkDialog
          open
          position={bmDialog.position}
          defaultRef={{ book: book.abbr, bookName: book.name, chapter }}
          defaultLabel={bookmarks.find(b => b.position === bmDialog.position)?.label}
          defaultColor={bookmarks.find(b => b.position === bmDialog.position)?.color}
          onClose={() => setBmDialog(null)}
          onSave={(label, color) => {
            setBookmark({ position: bmDialog.position, label, color, book: book.abbr, chapter, verse: null });
            toast({ title: "Ribbon saved", description: `${label} → ${book.name} ${chapter}` });
            setBmDialog(null);
          }}
        />
      )}

      {/* Anchor belief banner for this chapter */}
      {anchorBelief && !focusMode && (
        <button
          onClick={() => navigate(`/framework/beliefs/${anchorBelief.id}`)}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-30 max-w-[min(680px,92vw)] bg-paper border border-gold/50 rounded-full shadow-leather px-4 py-1.5 text-xs flex items-center gap-2 hover:bg-paper-warm transition"
          title="Your anchor belief for this chapter"
        >
          <Sparkles className="w-3.5 h-3.5 text-leather shrink-0" />
          <span className="ink-text truncate">{anchorBelief.statement}</span>
        </button>
      )}

      {!focusMode && <CompanionPane />}
    </div>
  );
}
