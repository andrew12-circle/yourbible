import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import {
  EOTC_BIBLE_ID,
  findBookByAbbr,
  getBooks,
  isEotcBibleId,
  readCanon,
} from "@/lib/bible/canon";
import type { PassageVerse } from "@/lib/bible/api";
import { groupVersesIntoParagraphs } from "@/lib/bible/parsePassageHtml";
import {
  ETHIOPIC_SCRIPTURE_FONT,
  fontChoiceLabel,
  LS_FONT_CHOICE_KEY,
  normalizeFontChoice,
  pageTypoClass,
  READER_SCRIPTURE_SIZE,
  readerScriptureTypographyStyle,
  scriptureFontFamily,
  type FontChoiceId,
} from "@/lib/bible/fontChoices";
import {
  clampReaderFontScale,
  effectiveReaderFontScaleEm,
  readStoredReaderFontScale,
  writeStoredReaderFontScale,
} from "@/lib/bible/readerFontScale";
import { LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { sharePassageSelection } from "@/lib/bible/shareVerse";
import { splitJesusSpeechForChapter, type Segment as JesusSegment } from "@/lib/bible/redLetter";
import {
  scriptureParagraphClassName,
} from "@/lib/bible/scriptureParagraph";
import { ScripturePlate } from "@/components/bible/ScripturePlate";
import { platesForChapter } from "@/lib/bible/biblePlates";
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
import { ReaderFloatingTabBar } from "@/components/bible/ReaderFloatingTabBar";
import { BookScene } from "@/components/bible/BookScene";
import { Paginator } from "@/components/bible/Paginator";
import { BookPaginator } from "@/components/bible/BookPaginator";
import { PageFlip } from "@/components/bible/PageFlip";
import { SwipePage } from "@/components/bible/SwipePage";
import { useChapterData, useBookmarks } from "@/hooks/useUserData";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import { usePassage } from "@/hooks/usePassage";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useReaderAudio } from "@/hooks/useReaderAudio";
import { useRecordReadingActivity } from "@/hooks/useReadingActivity";
import { BibleSearchDialog } from "@/components/bible/BibleSearchDialog";
import OfflineBanner from "@/components/OfflineBanner";
import { getPalette } from "@/lib/bible/palettes";
import { toolbarSelectionFromRange } from "@/lib/bible/verseSelection";
import { useReaderSpread, useReaderCompactChrome, useIsTabletPortrait, useCompactInkLayout } from "@/hooks/use-reader-layout";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  clearReaderReturn,
  persistReaderReturn,
  readReaderReturn,
  readerReturnFromState,
  type ReaderNavigationState,
} from "@/lib/bible/readerNavigation";
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
import { clearReaderInkChapter } from "@/lib/ink/readerInkChapterClear";
import { INK_PEN_COLORS, INK_PEN_SIZES } from "@/lib/ink/strokeRender";
import type { InkTool } from "@/lib/ink/types";
import {
  areSameSplits,
  isPageSplitsReady,
  pageCountFromSplits,
  pageVerseSlice,
} from "@/lib/bible/pageSplits";
import { getNextChapterRef, getPrevChapterRef } from "@/lib/bible/chapterNav";
import { buildAdjacentStreamChapters } from "@/lib/bible/readerStreamChapters";
import {
  areSameStreamSplits,
  buildReaderStream,
  ensureSpreadPageSplits,
  headingsForChapter,
  isStreamSplitsReady,
  paragraphStartsForChapter,
  sliceReaderPage,
  spreadPageForChapterEnd,
  spreadPageForChapterStart,
  streamPageCount,
} from "@/lib/bible/readerStream";
import { useAdjacentPassages } from "@/hooks/useAdjacentPassages";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import {
  readReaderHubFullscreen,
  readerOverlayPosition,
  writeReaderHubFullscreen,
} from "@/lib/bible/readerHubLayout";
import {
  coverStyle as buildCoverStyle,
  leatherCoverClass,
  pageToneClass,
} from "@/lib/bible/readerAppearance";
import {
  readReaderDisplayMode,
  writeReaderDisplayMode,
  type ReaderDisplayMode,
  readerDisplayModeLabel,
} from "@/lib/bible/readerDisplayMode";
import { readReaderDarkMode, writeReaderDarkMode } from "@/lib/bible/readerDarkMode";
import {
  readReaderColumnLayout,
  effectiveReaderColumnLayout,
  readerColumnClassName,
  readerColumnLayoutLabel,
  writeReaderColumnLayout,
  type ReaderColumnLayout,
} from "@/lib/bible/readerColumnLayout";
import { pageHorizontalPadding } from "@/lib/bible/readerPageMargins";
import {
  renderScriptureParagraphNodes,
  wrapScriptureColumns,
} from "@/lib/bible/readerScriptureRender";
import { createReaderVerseRenderer } from "@/lib/bible/readerVerseNode";
import { useBibleScrollWheel } from "@/hooks/useBibleScrollWheel";

const LS_HIGHLIGHT_COLOR_KEY = "yb.highlightColor";
/** Approximate chapter title block above the first page article (px). */
const CHAPTER_HEADER_RESERVE_PX = 96;
/** Extra slack so two-column pages do not clip the last line. */
const PAGINATOR_OVERFLOW_GUARD_PX = 20;

export default function ReaderPage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showHubShell } = useAppShellMode();
  const [hubFullscreen, setHubFullscreen] = useState(readReaderHubFullscreen);
  const containedInHub = showHubShell && !hubFullscreen;
  const overlayPos = readerOverlayPosition(containedInHub);
  const toggleHubFullscreen = useCallback(() => {
    setHubFullscreen((prev) => {
      const next = !prev;
      writeReaderHubFullscreen(next);
      return next;
    });
  }, []);
  const [searchParams] = useSearchParams();
  const params = useParams<{ book?: string; chapter?: string }>();
  const dailyToastShown = useRef(false);
  const [readerReturn, setReaderReturn] = useState<{ to: string; label: string } | null>(null);

  useEffect(() => {
    const fromState = readerReturnFromState(location.state);
    if (fromState) {
      setReaderReturn(fromState);
      persistReaderReturn({ returnTo: fromState.to, returnLabel: fromState.label });
      return;
    }
    setReaderReturn(readReaderReturn());
  }, [location.state]);

  const canonBooks = useMemo(() => getBooks(readCanon()), []);
  const defaultBookAbbr = readCanon() === "ethiopian" ? "Gen" : "Jhn";
  const book = useMemo(
    () => findBookByAbbr(params.book ?? defaultBookAbbr) ?? canonBooks.find((b) => b.abbr === defaultBookAbbr)!,
    [params.book, canonBooks, defaultBookAbbr],
  );
  const chapter = Math.max(1, Math.min(book.chapters, parseInt(params.chapter ?? "1", 10) || 1));
  const reference = useMemo(
    () => `${book.nameAm ?? book.name} ${chapter}`,
    [book.name, book.nameAm, chapter],
  );

  const online = useOnlineStatus();
  const { data: bibles = [], isError: biblesError } = useBibles();
  const displayBibles = useMemo(
    () =>
      readCanon() === "ethiopian"
        ? bibles.filter((b) => b.id === EOTC_BIBLE_ID)
        : bibles.filter((b) => b.id !== EOTC_BIBLE_ID),
    [bibles],
  );
  const [bibleId, setBibleId] = useState<string>(() => localStorage.getItem(LS_BIBLE_KEY) ?? "");
  const {
    data: passage,
    isLoading: loadingPassage,
    isError: passageError,
  } = usePassage(bibleId, book.abbr, chapter);
  const showCachedHint = !online || (passageError && !!passage);
  const [searchOpen, setSearchOpen] = useState(false);
  const readerAudio = useReaderAudio(reference, passage);
  useRecordReadingActivity(user?.id, book.abbr, chapter);

  useEffect(() => {
    if (readCanon() === "ethiopian") {
      if (bibleId !== EOTC_BIBLE_ID) {
        setBibleId(EOTC_BIBLE_ID);
        localStorage.setItem(LS_BIBLE_KEY, EOTC_BIBLE_ID);
      }
      return;
    }
    if (bibles.length === 0) return;
    const next = pickDefaultBibleId(bibles, bibleId || localStorage.getItem(LS_BIBLE_KEY));
    if (next && next !== bibleId) {
      setBibleId(next);
      localStorage.setItem(LS_BIBLE_KEY, next);
    } else if (!bibleId && next) {
      setBibleId(next);
      localStorage.setItem(LS_BIBLE_KEY, next);
    }
  }, [bibles, bibleId]);

  useEffect(() => {
    if (biblesError) {
      toast({ variant: "destructive", title: "Couldn't load translations", description: "Check your API.Bible key." });
    }
  }, [biblesError]);

  useEffect(() => {
    if (passageError && !passage) {
      toast({
        variant: "destructive",
        title: "Couldn't load passage",
        description: online ? "Check your connection and try again." : "This chapter is not saved for offline reading yet.",
      });
    }
  }, [passageError, passage, online]);

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
  const [fontScale, setFontScale] = useState<number>(() => readStoredReaderFontScale());
  const updateFontScale = (next: number) => {
    const clamped = clampReaderFontScale(next);
    setFontScale(clamped);
    writeStoredReaderFontScale(clamped);
  };
  const [fontChoice, setFontChoice] = useState<FontChoiceId>(() =>
    normalizeFontChoice(
      typeof window !== "undefined"
        ? localStorage.getItem(LS_FONT_CHOICE_KEY) ?? profile?.font_choice
        : profile?.font_choice,
    ),
  );

  useEffect(() => {
    if (!profile?.font_choice) return;
    const stored = localStorage.getItem(LS_FONT_CHOICE_KEY);
    if (stored) return;
    const next = normalizeFontChoice(profile.font_choice);
    setFontChoice(next);
    localStorage.setItem(LS_FONT_CHOICE_KEY, next);
  }, [profile?.font_choice]);

  const updateFontChoice = useCallback(async (choice: FontChoiceId) => {
    if (choice === fontChoice) return;
    setFontChoice(choice);
    localStorage.setItem(LS_FONT_CHOICE_KEY, choice);
    const { error } = await updateProfile({ font_choice: choice });
    if (error) {
      toast({
        variant: "destructive",
        title: "Couldn't save font",
        description: error.message,
      });
      return;
    }
    toast({
      title: "Scripture font updated",
      description: fontChoiceLabel(choice),
    });
  }, [fontChoice, updateProfile]);

  const readerSpread = useReaderSpread();
  const prevChapterRef = useMemo(() => getPrevChapterRef(book.abbr, chapter), [book.abbr, chapter]);
  const nextChapterRef = useMemo(() => getNextChapterRef(book.abbr, chapter), [book.abbr, chapter]);
  const adjacentPassages = useAdjacentPassages(
    bibleId,
    book.abbr,
    book.name,
    chapter,
    readerSpread,
  );
  const compactChrome = useReaderCompactChrome();
  const tabletPortrait = useIsTabletPortrait();
  const compactInkLayout = useCompactInkLayout();
  const [displayMode, setDisplayMode] = useState<ReaderDisplayMode>(() => readReaderDisplayMode());
  const [readerDark, setReaderDark] = useState(readReaderDarkMode);
  const [columnLayout, setColumnLayout] = useState<ReaderColumnLayout>(() => readReaderColumnLayout());

  useEffect(() => {
    try {
      if (!localStorage.getItem("yb.reader.displayMode") && compactChrome) {
        setDisplayMode("scroll");
      }
    } catch {
      /* ignore */
    }
  }, [compactChrome]);

  const scrollMode = displayMode === "scroll";
  const effectiveSpread = readerSpread && !scrollMode;
  const spreadColumnLayout = effectiveReaderColumnLayout({
    spread: effectiveSpread,
    stored: columnLayout,
  });
  const columnClassName = readerColumnClassName(spreadColumnLayout);
  const readerPageClass = cn(
    pageToneClass(profile?.page_tone),
    readerDark && "reader-theme-dark",
  );
  const readerCoverStyle = buildCoverStyle(profile?.cover);
  const readerCoverClass = leatherCoverClass(profile?.cover);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => {
      const next: ReaderDisplayMode = prev === "scroll" ? "pages" : "scroll";
      writeReaderDisplayMode(next);
      toast({ title: `${readerDisplayModeLabel(next)} reading` });
      return next;
    });
  }, []);

  const toggleReaderDark = useCallback(() => {
    setReaderDark((prev) => {
      const next = !prev;
      writeReaderDarkMode(next);
      return next;
    });
  }, []);

  const toggleColumnLayout = useCallback(() => {
    setColumnLayout((prev) => {
      const next: ReaderColumnLayout = prev === "double" ? "single" : "double";
      writeReaderColumnLayout(next);
      toast({ title: readerColumnLayoutLabel(next) });
      return next;
    });
  }, []);

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
  const inkAnchorRefCallbacks = useRef(new Map<string, (el: HTMLDivElement | null) => void>());
  const inkGetAnchorFns = useRef(new Map<string, () => HTMLDivElement | null>());

  const getInkAnchorRef = useCallback((id: string) => {
    let cb = inkAnchorRefCallbacks.current.get(id);
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        if (el) inkAnchorRefs.current.set(id, el);
        else inkAnchorRefs.current.delete(id);
      };
      inkAnchorRefCallbacks.current.set(id, cb);
    }
    return cb;
  }, []);

  const getInkAnchorEl = useCallback((id: string) => {
    let fn = inkGetAnchorFns.current.get(id);
    if (!fn) {
      fn = () => inkAnchorRefs.current.get(id) ?? null;
      inkGetAnchorFns.current.set(id, fn);
    }
    return fn;
  }, []);

  // Persist last-read position so the home screen can offer "continue".
  useEffect(() => {
    try { localStorage.setItem("yb_last_read", `${book.abbr}/${chapter}`); } catch { /* ignore */ }
  }, [book.abbr, chapter]);

  // Total chapters across the canon → progress through the Bible
  const { progress, chaptersBefore, totalChapters: _totalChapters } = useMemo(() => {
    const total = canonBooks.reduce((s, b) => s + b.chapters, 0);
    let before = 0;
    for (const b of canonBooks) {
      if (b.abbr === book.abbr) break;
      before += b.chapters;
    }
    return {
      progress: Math.max(0, Math.min(1, (before + chapter - 1) / Math.max(1, total - 1))),
      chaptersBefore: before,
      totalChapters: total,
    };
  }, [book.abbr, chapter, canonBooks]);


  const { highlights, notes, setMark: _setMark, setMarks, setMarkRanges, upsertNote, deleteNote } =
    useChapterData(book.abbr, chapter);
  const prevChapterMarks = useChapterData(
    prevChapterRef?.book.abbr ?? "",
    prevChapterRef?.chapter ?? 0,
    readerSpread && prevChapterRef != null,
  );
  const nextChapterMarks = useChapterData(
    nextChapterRef?.book.abbr ?? "",
    nextChapterRef?.chapter ?? 0,
    readerSpread && nextChapterRef != null,
  );
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

  // ---- Page measurement ----
  // We measure the *actual* rendered page article so pagination matches
  // exactly what the reader sees on any screen size. The page surface
  // registers itself via the ref callback below.
  const [pageBox, setPageBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [firstPageHeight, setFirstPageHeight] = useState(0);
  const layoutFingerprint = useMemo(
    () =>
      computeReaderLayoutFingerprint({
        bibleId: bibleId || "default",
        fontScale: effectiveReaderFontScaleEm(fontScale, readerSpread),
        pageWidth: Math.max(180, pageBox.w),
        pageHeight: Math.max(180, pageBox.h),
        singlePage: !readerSpread,
        columnLayout: spreadColumnLayout,
      }),
    [bibleId, fontScale, pageBox.w, pageBox.h, readerSpread, spreadColumnLayout],
  );

  useEffect(() => {
    setStaleLayoutInk(false);
  }, [layoutFingerprint]);
  const articleRoRef = useRef<ResizeObserver | null>(null);
  const measureRafRef = useRef<number | null>(null);
  const articleElsRef = useRef<{ first: HTMLElement | null; rest: HTMLElement | null }>({
    first: null,
    rest: null,
  });
  const measureFirstRef = useRef<(el: HTMLElement | null) => void>(() => {});
  const measureRestRef = useRef<(el: HTMLElement | null) => void>(() => {});
  const flipLockUntil = useRef(0);
  const PAGE_BOX_QUANT = 12;
  const quantizePageBox = useCallback((width: number, height: number) => {
    const w = Math.round(width / PAGE_BOX_QUANT) * PAGE_BOX_QUANT;
    const h = Math.round(height / PAGE_BOX_QUANT) * PAGE_BOX_QUANT;
    return { w, h };
  }, []);
  const syncPageMeasurements = useCallback(() => {
    if (performance.now() < flipLockUntil.current) return;
    const firstEl = articleElsRef.current.first;
    const restEl = articleElsRef.current.rest;
    const nextFirst = firstEl
      ? quantizePageBox(firstEl.clientWidth, firstEl.clientHeight).h
      : 0;
    const restBox = restEl
      ? quantizePageBox(restEl.clientWidth, restEl.clientHeight)
      : null;
    if (nextFirst > 0) {
      setFirstPageHeight((prev) => (prev === nextFirst ? prev : nextFirst));
    }
    if (restBox && restBox.w > 0 && restBox.h > 0) {
      setPageBox((prev) =>
        prev.w === restBox.w && prev.h === restBox.h ? prev : restBox,
      );
    } else if (firstEl) {
      // Portrait single-page: only the first (header) page is visible at chapter
      // start, so rest never mounts — still capture width so Paginator can run.
      const firstBox = quantizePageBox(firstEl.clientWidth, firstEl.clientHeight);
      if (firstBox.w > 0) {
        setPageBox((prev) =>
          prev.w === firstBox.w ? prev : { w: firstBox.w, h: prev.h },
        );
      }
    }
  }, [quantizePageBox]);
  const scheduleSyncPageMeasurements = useCallback(() => {
    if (measureRafRef.current != null) return;
    measureRafRef.current = requestAnimationFrame(() => {
      measureRafRef.current = null;
      syncPageMeasurements();
    });
  }, [syncPageMeasurements]);
  const attachArticleObservers = useCallback(() => {
    if (articleRoRef.current) {
      articleRoRef.current.disconnect();
      articleRoRef.current = null;
    }
    const { first, rest } = articleElsRef.current;
    if (!first && !rest) return;
    const ro = new ResizeObserver(() => scheduleSyncPageMeasurements());
    if (first) {
      ro.observe(first);
      if (first.parentElement) ro.observe(first.parentElement);
    }
    if (rest) {
      ro.observe(rest);
      if (rest.parentElement) ro.observe(rest.parentElement);
    }
    articleRoRef.current = ro;
    scheduleSyncPageMeasurements();
  }, [scheduleSyncPageMeasurements]);
  const bindArticleMeasure = useCallback(
    (role: "first" | "rest") => (el: HTMLElement | null) => {
      if (articleElsRef.current[role] === el) return;
      articleElsRef.current[role] = el;
      attachArticleObservers();
    },
    [attachArticleObservers],
  );
  measureFirstRef.current = bindArticleMeasure("first");
  measureRestRef.current = bindArticleMeasure("rest");
  const onMeasureFirstRef = useCallback((el: HTMLElement | null) => {
    measureFirstRef.current(el);
  }, []);
  const onMeasureRestRef = useCallback((el: HTMLElement | null) => {
    measureRestRef.current(el);
  }, []);
  // Recompute on viewport changes too (orientation/resize/zoom).
  useEffect(() => {
    const onResize = () => scheduleSyncPageMeasurements();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      vv?.removeEventListener("resize", onResize);
      if (measureRafRef.current != null) {
        cancelAnimationFrame(measureRafRef.current);
        measureRafRef.current = null;
      }
    };
  }, [scheduleSyncPageMeasurements]);

  // ---- Pagination ----
  const [splits, setSplits] = useState<number[]>([0]);
  const [streamSplits, setStreamSplits] = useState<number[]>([0]);
  const handleSplitsChange = useCallback((next: number[]) => {
    setSplits((prev) => (areSameSplits(prev, next) ? prev : next));
  }, []);
  const handleStreamSplitsChange = useCallback((next: number[]) => {
    setStreamSplits((prev) => (areSameStreamSplits(prev, next) ? prev : next));
  }, []);
  // Reset splits when chapter / typography changes; keep measured page box so
  // Paginator stays mounted and the article shell does not unmount/remount.
  useEffect(() => {
    setSplits([0]);
    setStreamSplits([0]);
  }, [book.abbr, chapter, readerSpread, fontScale, fontChoice, spreadColumnLayout]);
  useLayoutEffect(() => {
    articleElsRef.current = { first: null, rest: null };
    articleRoRef.current?.disconnect();
    articleRoRef.current = null;
  }, [book.abbr, chapter]);
  const verses = passage?.verses ?? [];
  const chapterPlates = useMemo(
    () => platesForChapter(book.abbr, chapter),
    [book.abbr, chapter],
  );
  const hasChapterPlates = chapterPlates.length > 0;
  const streamChapters = useMemo(
    () => {
      if (readerSpread) {
        return buildAdjacentStreamChapters(
          adjacentPassages.prevRef,
          adjacentPassages.prev,
          book.abbr,
          book.name,
          chapter,
          adjacentPassages.current ?? passage,
          adjacentPassages.nextRef,
          adjacentPassages.next,
        );
      }
      if (hasChapterPlates && passage) {
        return [
          {
            bookAbbr: book.abbr,
            bookName: book.name,
            chapter,
            verses: passage.verses,
            paragraphStarts: passage.paragraphStarts ?? (passage.verses[0] ? [passage.verses[0].number] : []),
            headings: passage.headings ?? [],
          },
        ];
      }
      return [];
    },
    [
      readerSpread,
      hasChapterPlates,
      adjacentPassages.prevRef,
      adjacentPassages.prev,
      adjacentPassages.current,
      adjacentPassages.next,
      adjacentPassages.nextRef,
      book.abbr,
      book.name,
      chapter,
      passage,
    ],
  );
  const readerStream = useMemo(
    () => (streamChapters.length > 0 ? buildReaderStream(streamChapters) : []),
    [streamChapters],
  );
  const paginatorParagraphStarts = useMemo(
    () => passage?.paragraphStarts ?? (verses[0] ? [verses[0].number] : []),
    [passage?.paragraphStarts, verses],
  );
  const paginatorHeadings = useMemo(
    () => passage?.headings ?? [],
    [passage?.headings],
  );
  const ethiopianText = isEotcBibleId(bibleId);
  const scriptureFont = ethiopianText ? ETHIOPIC_SCRIPTURE_FONT : scriptureFontFamily(fontChoice);
  const scriptureTypoClass = ethiopianText
    ? `font-ethiopic ${READER_SCRIPTURE_SIZE} leading-[1.72] ink-text`
    : pageTypoClass(fontChoice);
  const paginatorFontStyle = useMemo(
    () => ({
      ...readerScriptureTypographyStyle(fontChoice, fontScale, { desktopSpread: readerSpread }),
      fontFamily: scriptureFont,
      ["--reader-scripture-font-family" as string]: scriptureFont,
    }),
    [fontChoice, fontScale, scriptureFont, readerSpread],
  );
  const paragraphStarts = useMemo(
    () => new Set(passage?.paragraphStarts ?? (verses[0] ? [verses[0].number] : [])),
    [passage?.paragraphStarts, verses],
  );
  const headingByVerse = useMemo(() => {
    const m = new Map<number, string>();
    for (const h of passage?.headings ?? []) m.set(h.beforeVerse, h.text);
    return m;
  }, [passage?.headings]);
  const verseLengths = useMemo(() => {
    const m = new Map<number, number>();
    for (const v of verses) m.set(v.number, (typeof v.text === "string" ? v.text : "").length);
    return m;
  }, [verses]);
  const highlightColor =
    activeHighlightColor ||
    getPalette(profile?.highlight_palette ?? "classic").colors[0]?.cssVar ||
    "--hl-amber";
  const totalPagesInChapter = pageCountFromSplits(splits, verses.length);
  const splitsReady = isPageSplitsReady(splits, verses.length);
  const useBookSpread = readerSpread && !scrollMode && verses.length > 0;
  const useStreamReader = useBookSpread || (hasChapterPlates && !!passage);
  const useSpreadDoubleColumn =
    effectiveSpread && useStreamReader && !scrollMode;
  const displayStreamSplits = useMemo(() => {
    if (!useSpreadDoubleColumn || readerStream.length === 0) return streamSplits;
    return ensureSpreadPageSplits(streamSplits, readerStream);
  }, [useSpreadDoubleColumn, streamSplits, readerStream]);
  const navStreamSplits = useSpreadDoubleColumn ? displayStreamSplits : streamSplits;
  const totalStreamPages =
    useSpreadDoubleColumn && readerStream.length > 2
      ? Math.max(2, streamPageCount(navStreamSplits, readerStream.length))
      : streamPageCount(navStreamSplits, readerStream.length);
  const streamSplitsReady = isStreamSplitsReady(streamSplits, readerStream.length);
  /** Article measurement already excludes the page footer; only reserve clip slack. */
  const paginatorFooterHeight = PAGINATOR_OVERFLOW_GUARD_PX;
  const totalPagesForNav = useStreamReader ? totalStreamPages : totalPagesInChapter;

  // Pre-compute red-letter segmentation for the whole chapter so multi-verse
  // quotes (an opener in v.5, closer in v.8) carry red text across verses.
  const redSegments = useMemo<Map<number, JesusSegment[]>>(
    () =>
      isEotcBibleId(bibleId)
        ? new Map()
        : splitJesusSpeechForChapter(book.abbr, chapter, verses),
    [bibleId, book.abbr, chapter, verses],
  );
  const redSegmentsByChapter = useMemo(() => {
    const m = new Map<string, Map<number, JesusSegment[]>>();
    if (isEotcBibleId(bibleId)) return m;
    const chaptersToMap = useStreamReader
      ? streamChapters
      : [{ bookAbbr: book.abbr, chapter, verses }];
    for (const ch of chaptersToMap) {
      const chVerses = "verses" in ch ? ch.verses : verses;
      m.set(
        `${ch.bookAbbr}|${ch.chapter}`,
        splitJesusSpeechForChapter(ch.bookAbbr, ch.chapter, chVerses),
      );
    }
    return m;
  }, [bibleId, useStreamReader, streamChapters, book.abbr, chapter, verses]);

  // ---- Page cursor (which page within this chapter is showing) ----
  const [chapterPage, setChapterPage] = useState(0);
  const [spreadPageIdx, setSpreadPageIdx] = useState(0);
  const [pendingSpreadEnd, setPendingSpreadEnd] = useState(false);
  const skipSpreadUrlSyncRef = useRef(true);
  const lastSpreadAnchorKeyRef = useRef("");
  const [flipDirection, setFlipDirection] = useState<"forward" | "back">("forward");
  useEffect(() => {
    setChapterPage(0);
    setSpreadPageIdx(0);
    setPendingSpreadEnd(false);
    skipSpreadUrlSyncRef.current = true;
    lastSpreadAnchorKeyRef.current = "";
  }, [book.abbr, chapter, fontScale, spreadColumnLayout]);

  useEffect(() => {
    if (!scrollMode) return;
    const el = document.querySelector<HTMLElement>("[data-ink-anchor]");
    el?.scrollTo(0, 0);
  }, [book.abbr, chapter, scrollMode]);

  useBibleScrollWheel(scrollMode, `${book.abbr}-${chapter}`);

  // Pending verse-jump: after the user picks a verse from the TopBar picker,
  // remember it so once the chapter (re)loads and pagination splits are known,
  // we can hop to the page that contains that verse.
  const [pendingVerse, setPendingVerse] = useState<number | null>(null);

  const bookmarkVerse = useMemo(() => {
    if (activeVerse?.number) return activeVerse.number;
    if (pendingVerse != null) return pendingVerse;
    if (tbSel?.verses[0]) return tbSel.verses[0];
    return 1;
  }, [activeVerse?.number, pendingVerse, tbSel?.verses]);

  useEffect(() => {
    const v = parseInt(searchParams.get("v") ?? "", 10);
    if (v > 0) setPendingVerse(v);
  }, [book.abbr, chapter, searchParams]);

  useEffect(() => {
    if (dailyToastShown.current) return;
    const state = location.state as ReaderNavigationState | null;
    if (!state?.dailyPrompt) return;
    dailyToastShown.current = true;
    const desc = state.dailyReason
      ? `${state.dailyReason}\n\n${state.dailyPrompt}`
      : state.dailyPrompt;
    toast({ title: "Today's reflection", description: desc });
    const preserved: ReaderNavigationState = {};
    if (state.returnTo) {
      preserved.returnTo = state.returnTo;
      preserved.returnLabel = state.returnLabel;
    }
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: preserved });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (pendingVerse == null) return;
    if (useStreamReader) {
      if (!streamSplitsReady) return;
      let target = 0;
      for (let p = 0; p < streamSplits.length - 1; p++) {
        const slice = sliceReaderPage(readerStream, streamSplits, p);
        const containsVerse = slice?.verseGroups.some(
          (g) =>
            g.bookAbbr === book.abbr &&
            g.chapter === chapter &&
            g.verses.some((v) => v.number === pendingVerse),
        );
        if (containsVerse) target = p;
      }
      if (useBookSpread && target % 2 === 1) target -= 1;
      if (useBookSpread) setSpreadPageIdx(Math.max(0, target));
      else setChapterPage(Math.max(0, target));
      setPendingVerse(null);
      return;
    }
    if (!splitsReady) return;
    let target = 0;
    for (let i = 0; i < splits.length; i++) {
      if (splits[i] < pendingVerse) target = i;
      else break;
    }
    setChapterPage(Math.max(0, target));
    setPendingVerse(null);
  }, [
    pendingVerse,
    splits,
    splitsReady,
    streamSplits,
    streamSplitsReady,
    readerStream,
    useStreamReader,
    useBookSpread,
    book.abbr,
    chapter,
  ]);

  useEffect(() => {
    if (!useStreamReader || !streamSplitsReady || pendingVerse != null) return;
    const anchorKey = `${book.abbr}|${chapter}|${pendingSpreadEnd ? "end" : "start"}`;
    const needsAnchor = lastSpreadAnchorKeyRef.current !== anchorKey;
    if (!needsAnchor) return;
    lastSpreadAnchorKeyRef.current = anchorKey;
    if (useBookSpread && pendingSpreadEnd) {
      setSpreadPageIdx(
        spreadPageForChapterEnd(readerStream, streamSplits, book.abbr, chapter),
      );
      setPendingSpreadEnd(false);
      return;
    }
    const startPage = spreadPageForChapterStart(
      readerStream,
      streamSplits,
      book.abbr,
      chapter,
    );
    if (useBookSpread) setSpreadPageIdx(startPage);
    else setChapterPage(startPage);
  }, [
    useStreamReader,
    useBookSpread,
    streamSplitsReady,
    streamSplits,
    readerStream,
    book.abbr,
    chapter,
    pendingSpreadEnd,
    pendingVerse,
  ]);

  // Spread shows two consecutive pages; portrait mobile shows one page per turn.
  const pagesPerTurn = effectiveSpread ? 2 : 1;

  const goPage = (delta: number) => {
    flipLockUntil.current = performance.now() + 420;
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    tbSelRef.current = null;
    setTbSel(null);
    setFlipDirection(delta > 0 ? "forward" : "back");
    if (useBookSpread) {
      const next = spreadPageIdx + delta * pagesPerTurn;
      if (next < 0) {
        const prev = getPrevChapterRef(book.abbr, chapter);
        if (prev) {
          setPendingSpreadEnd(true);
          navigate(`/read/${prev.book.abbr}/${prev.chapter}`);
        }
        return;
      }
      if (next >= totalStreamPages) {
        const nxt = getNextChapterRef(book.abbr, chapter);
        if (nxt) navigate(`/read/${nxt.book.abbr}/${nxt.chapter}`);
        return;
      }
      startTransition(() => setSpreadPageIdx(next));
      return;
    }
    if (useStreamReader && streamSplitsReady) {
      const next = chapterPage + delta * pagesPerTurn;
      if (next < 0) {
        const prev = getPrevChapterRef(book.abbr, chapter);
        if (prev) navigate(`/read/${prev.book.abbr}/${prev.chapter}`);
        return;
      }
      if (next >= totalStreamPages) {
        const nxt = getNextChapterRef(book.abbr, chapter);
        if (nxt) navigate(`/read/${nxt.book.abbr}/${nxt.chapter}`);
        return;
      }
      startTransition(() => setChapterPage(next));
      return;
    }
    const next = chapterPage + delta * pagesPerTurn;
    if (next < 0) {
      const prev = getPrevChapterRef(book.abbr, chapter);
      if (prev) navigate(`/read/${prev.book.abbr}/${prev.chapter}`);
    } else if (next >= totalPagesForNav) {
      const nxt = getNextChapterRef(book.abbr, chapter);
      if (nxt) navigate(`/read/${nxt.book.abbr}/${nxt.chapter}`);
    } else {
      startTransition(() => setChapterPage(next));
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

  const chapterMarksFor = (bookAbbr: string, chapterNum: number) => {
    if (bookAbbr === book.abbr && chapterNum === chapter) {
      return { highlights, notes, setMarks, setMarkRanges };
    }
    if (
      prevChapterRef &&
      bookAbbr === prevChapterRef.book.abbr &&
      chapterNum === prevChapterRef.chapter
    ) {
      return prevChapterMarks;
    }
    if (
      nextChapterRef &&
      bookAbbr === nextChapterRef.book.abbr &&
      chapterNum === nextChapterRef.chapter
    ) {
      return nextChapterMarks;
    }
    return {
      highlights: [] as typeof highlights,
      notes: [] as typeof notes,
      setMarks: async () => {},
      setMarkRanges: async () => {},
    };
  };
  const noteFor = (n: number, bookAbbr = book.abbr, chapterNum = chapter) =>
    chapterMarksFor(bookAbbr, chapterNum).notes.find((x) => x.verse === n);
  const hlsFor = (n: number, bookAbbr = book.abbr, chapterNum = chapter) =>
    chapterMarksFor(bookAbbr, chapterNum).highlights.filter(
      (x) => x.verse === n && (x.kind ?? "highlight") === "highlight",
    );
  const hlFor = (n: number, bookAbbr = book.abbr, chapterNum = chapter) => hlsFor(n, bookAbbr, chapterNum)[0];
  const ulFor = (n: number, bookAbbr = book.abbr, chapterNum = chapter) =>
    chapterMarksFor(bookAbbr, chapterNum).highlights.find(
      (x) => x.verse === n && x.kind === "underline",
    );

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

  const defaultInkLayerId = useBookSpread
    ? `${book.abbr}-${chapter}-${spreadPageIdx}-left`
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
    window.requestAnimationFrame(() => {
      setInkToolbarCollapsed((prev) => (prev ? prev : true));
    });
  }, []);

  const runInkAction = useCallback(
    (action: "undo" | "redo" | "clear", options?: { skipConfirm?: boolean }) => {
      const api = inkApisRef.current.get(focusedInkLayerIdRef.current);
      if (!api) return;
      if (action === "undo") api.undo();
      else if (action === "redo") api.redo();
      else api.clear(options);
      setInkToolbarState(api.getState());
    },
    [],
  );

  const clearChapterInk = useCallback(async () => {
    const label = `${book.name} ${chapter}`;
    if (
      !window.confirm(
        `Remove all handwritten ink from ${label}? This cannot be undone.`,
      )
    ) {
      return;
    }
    for (const api of inkApisRef.current.values()) {
      api.clear({ skipConfirm: true });
    }
    await clearReaderInkChapter(user?.id, book.abbr, chapter);
    const focused = inkApisRef.current.get(focusedInkLayerIdRef.current);
    if (focused) setInkToolbarState(focused.getState());
  }, [book.abbr, book.name, chapter, user?.id]);

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

  const renderVerse = useMemo(
    () =>
      createReaderVerseRenderer({
        bookAbbr: book.abbr,
        chapter,
        useBookSpread,
        redSegments,
        redSegmentsByChapter,
        ulFor,
        hlsFor,
        noteFor,
        onVerseNumberClick,
        navigate,
        setNoteOpen,
      }),
    [
      book.abbr,
      chapter,
      useBookSpread,
      redSegments,
      redSegmentsByChapter,
      ulFor,
      hlsFor,
      noteFor,
      onVerseNumberClick,
      navigate,
      setNoteOpen,
    ],
  );

  const openReaderSettings = () => setSettingsOpenRequest((n) => n + 1);
  const scriptureNodes = (
    groups: { bookAbbr: string; chapter: number; verses: PassageVerse[] }[],
    resolveParagraphStarts: (bookAbbr: string, chapter: number) => Set<number>,
    resolveHeading: (bookAbbr: string, chapter: number) => Map<number, string>,
  ) => renderScriptureParagraphNodes(groups, resolveParagraphStarts, resolveHeading, renderVerse);

  // JSX factory — not an inline component type (which would remount ink on every parent render).
  const renderPageSurface = (pageIdx: number, side: "left" | "right") => {
    const pageOutOfRange = !scrollMode && pageIdx >= totalPagesForNav;
    const splitsForPage = useSpreadDoubleColumn ? displayStreamSplits : streamSplits;
    const streamSlice =
      useStreamReader && !scrollMode && !pageOutOfRange
        ? sliceReaderPage(readerStream, splitsForPage, pageIdx)
        : null;
    const slice =
      scrollMode || useStreamReader || pageOutOfRange
        ? null
        : pageVerseSlice(splits, pageIdx, verses);
    const pageContentReady = pageOutOfRange
      ? false
      : useStreamReader
        ? streamSlice != null &&
          (streamSlice.isPlatePage || streamSlice.verseGroups.length > 0)
        : slice != null;
    const activePageIdx = useBookSpread ? spreadPageIdx : chapterPage;
    const pagePrimary = streamSlice?.primaryChapter;
    const pageBookAbbr = pagePrimary?.bookAbbr ?? book.abbr;
    const pageBookName = pagePrimary?.bookName ?? book.name;
    const pageChapter = pagePrimary?.chapter ?? chapter;
    const measuresFirstPage =
      useBookSpread
        ? side === "left" &&
          pageIdx === spreadPageIdx &&
          streamSlice?.startsWithChapterHeader != null
        : pageIdx === 0 && side === "left" && chapterPage === 0;
    const isCurrentLeftPage = side === "left" && pageIdx === activePageIdx;
    const isOpeningRightPage =
      useBookSpread
        ? side === "right" && pageIdx === spreadPageIdx + 1
        : readerSpread && chapterPage === 0 && pageIdx === 1 && side === "right";
    const measuresRestPage =
      isOpeningRightPage ||
      (isCurrentLeftPage && !measuresFirstPage);
    const globalPage = chaptersBefore + pageChapter;
    const inkLayerId = `${pageBookAbbr}-${pageChapter}-${pageIdx}-${side}`;
    const pageLoading = loadingPassage && verses.length === 0;
    const ready = scrollMode || pageContentReady;
    const paginationPending =
      !scrollMode &&
      !pageOutOfRange &&
      !pageContentReady &&
      verses.length > 0;
    const showPaginationFallback =
      paginationPending && pageIdx === (useBookSpread ? spreadPageIdx : chapterPage);
    const attachMeasureRef = effectiveSpread
      ? side === "left" && pageIdx === spreadPageIdx
        ? measuresFirstPage
          ? onMeasureFirstRef
          : onMeasureRestRef
        : undefined
      : measuresFirstPage
        ? onMeasureFirstRef
        : measuresRestPage || isCurrentLeftPage
          ? onMeasureRestRef
          : undefined;
    if (scrollMode && pageIdx !== chapterPage) {
      return <div className="h-full min-h-0" aria-hidden />;
    }
    const scriptureColumnHeightPx =
      !scrollMode && columnClassName
        ? measuresFirstPage && firstPageHeight > 0
          ? firstPageHeight
          : pageBox.h > 0
            ? pageBox.h
            : undefined
        : undefined;
    return (
      <div
        className={cn(
          "relative flex flex-col h-full min-h-0 overflow-hidden bg-paper pt-10 pb-2",
          readerPageClass,
          inkMode && "reader-ink-active",
        )}
        style={pageHorizontalPadding(side, !effectiveSpread, compactChrome)}
      >
        <div
          className={`flex-shrink-0 ${
            !effectiveSpread || side === "left" ? "text-left" : "text-right"
          } ${inkMode ? "pointer-events-none" : ""}`}
        >
          <button
            type="button"
            onClick={openReaderSettings}
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium hover:text-muted-foreground transition-colors"
            aria-label={`${pageBookName} — open reader settings`}
          >
            {pageBookName}
          </button>
        </div>
        {pageLoading ? (
          <div className="flex flex-1 justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-leather/60" />
          </div>
        ) : pageOutOfRange ? (
          effectiveSpread && measuresRestPage ? (
            <div className="flex flex-1 min-h-0 min-w-0" aria-hidden>
              <article
                ref={onMeasureRestRef}
                data-reading-area
                className={cn("h-full min-h-0 w-full overflow-hidden", scriptureTypoClass)}
                style={{
                  ...readerScriptureTypographyStyle(fontChoice, fontScale, {
                    desktopSpread: readerSpread,
                  }),
                  fontFamily: scriptureFont,
                  ["--reader-scripture-font-family" as string]: scriptureFont,
                }}
              />
            </div>
          ) : (
            <div className="flex flex-1 min-h-0" aria-hidden />
          )
        ) : (
          <div
            ref={getInkAnchorRef(inkLayerId)}
            data-ink-anchor={inkLayerId}
            data-bible-scroll={scrollMode ? "" : undefined}
            className={cn(
              "relative flex-1 min-h-0 min-w-0",
              scrollMode
                ? "block overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide"
                : "flex",
            )}
          >
            {paginationPending && showPaginationFallback ? (
              <div
                className="absolute inset-0 z-[2] flex items-center justify-center bg-paper/40 pointer-events-none"
                aria-hidden
              >
                <Loader2 className="w-5 h-5 animate-spin text-leather/50" />
              </div>
            ) : null}
            <article
              ref={attachMeasureRef}
              data-reading-area
              aria-busy={!ready}
              className={cn(
                scrollMode ? "w-full" : "h-full min-h-0 w-full overflow-hidden",
                scriptureTypoClass,
                inkMode ? "!select-none" : "selectable-text",
              )}
              style={{
                ...readerScriptureTypographyStyle(fontChoice, fontScale, {
                  desktopSpread: readerSpread,
                }),
                fontFamily: scriptureFont,
                ["--reader-scripture-font-family" as string]: scriptureFont,
              }}
            >
              {wrapScriptureColumns(
                spreadColumnLayout,
                scrollMode,
                scrollMode && useStreamReader && streamChapters.length > 0 ? (
                  scriptureNodes(
                    streamChapters.map((ch) => ({
                      bookAbbr: ch.bookAbbr,
                      chapter: ch.chapter,
                      verses: ch.verses,
                    })),
                    (bookAbbr, ch) =>
                      new Set(paragraphStartsForChapter(streamChapters, bookAbbr, ch)),
                    (bookAbbr, ch) =>
                      new Map(
                        headingsForChapter(streamChapters, bookAbbr, ch).map((h) => [
                          h.beforeVerse,
                          h.text,
                        ]),
                      ),
                  )
                ) : scrollMode && verses.length > 0 ? (
                  scriptureNodes(
                    [{ bookAbbr: book.abbr, chapter, verses }],
                    () => paragraphStarts,
                    () => headingByVerse,
                  )
                ) : streamSlice?.isPlatePage && ready ? (
                streamSlice.plates.map((plate) => (
                  <ScripturePlate key={plate.id} plate={plate} />
                ))
              ) : useStreamReader && streamSlice && pageContentReady ? (
                scriptureNodes(
                  streamSlice.verseGroups.map((verseGroup) => ({
                    bookAbbr: verseGroup.bookAbbr,
                    chapter: verseGroup.chapter,
                    verses: verseGroup.verses,
                  })),
                  (bookAbbr, ch) =>
                    new Set(paragraphStartsForChapter(streamChapters, bookAbbr, ch)),
                  (bookAbbr, ch) =>
                    new Map(
                      headingsForChapter(streamChapters, bookAbbr, ch).map((h) => [
                        h.beforeVerse,
                        h.text,
                      ]),
                    ),
                )
              ) : slice && slice.length > 0 ? (
                (() =>
                  groupVersesIntoParagraphs(slice, paragraphStarts).flatMap((group) => {
                    const nodes: ReactNode[] = [];
                    const first = group.verses[0]?.number;
                    const heading = first != null ? headingByVerse.get(first) : undefined;
                    if (heading) {
                      nodes.push(
                        <p key={`h-${first}`} className="scripture-heading">
                          {heading}
                        </p>,
                      );
                    }
                    nodes.push(
                      <p
                        key={`p-${first}`}
                        className={scriptureParagraphClassName(group.isContinuation)}
                        style={{ orphans: 2, widows: 2 }}
                      >
                        {group.verses.map((v) =>
                          renderVerse(v, { paragraphIsContinuation: group.isContinuation }),
                        )}
                      </p>,
                    );
                    return nodes;
                  }))()
              ) : showPaginationFallback ? (
                (() =>
                  groupVersesIntoParagraphs(verses, paragraphStarts).flatMap((group) => {
                    const nodes: ReactNode[] = [];
                    const first = group.verses[0]?.number;
                    const heading = first != null ? headingByVerse.get(first) : undefined;
                    if (heading) {
                      nodes.push(
                        <p key={`h-${first}`} className="scripture-heading">
                          {heading}
                        </p>,
                      );
                    }
                    nodes.push(
                      <p
                        key={`p-${first}`}
                        className={scriptureParagraphClassName(group.isContinuation)}
                        style={{ orphans: 2, widows: 2 }}
                      >
                        {group.verses.map((v) =>
                          renderVerse(v, { paragraphIsContinuation: group.isContinuation }),
                        )}
                      </p>,
                    );
                    return nodes;
                  }))()
              ) : null,
                scriptureColumnHeightPx,
              )}
            </article>
          </div>
        )}
        {!pageLoading && ready ? (
          <ReaderInkLayer
            layerId={inkLayerId}
            interactive={inkMode}
            getAnchorEl={getInkAnchorEl(inkLayerId)}
            userId={user?.id}
            pageKey={{ book: pageBookAbbr, chapter: pageChapter, pageIndex: pageIdx, side }}
            layoutFingerprint={layoutFingerprint}
            anchorVerse={streamSlice?.anchorVerse ?? slice?.[0]?.number ?? null}
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
        {!focusMode && !scrollMode ? (
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
                aria-label={`${pageBookName} — open reader settings`}
              >
                {pageBookName}
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

  // Determine left & right page indices (spread = two consecutive pages)
  const activePageIdx = useBookSpread ? spreadPageIdx : chapterPage;
  const leftIdx = activePageIdx;
  const rightIdx = effectiveSpread ? activePageIdx + 1 : activePageIdx;
  const subsequentPageHeight =
    pageBox.h > 0
      ? pageBox.h
      : firstPageHeight > 0
        ? firstPageHeight + CHAPTER_HEADER_RESERVE_PX
        : 0;
  const paginatorFirstPageHeight =
    firstPageHeight > 0 ? firstPageHeight : subsequentPageHeight;

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!loading && user && needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  const showReaderDock = !showHubShell && compactChrome && !focusMode;

  return (
    <div
      data-bible-reader
      className={cn(
        "relative transition-all duration-700 overflow-hidden",
        (containedInHub || !showHubShell) && "flex h-full min-h-0 flex-col",
        showHubShell && hubFullscreen && "fixed inset-0 z-[100] min-h-0",
        !showHubShell && "h-[100dvh]",
        focusMode && "saturate-[0.88] contrast-[0.97] bg-paper/98",
      )}
    >
      <MarkerSvgFilter />

      <OfflineBanner showCachedHint={showCachedHint && !!passage} />

      <TopBar
        reference={reference}
        collapsed={false}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode(f => !f)}
        bibleId={bibleId}
        bibles={displayBibles}
        books={canonBooks}
        onChangeBible={(id) => { setBibleId(id); localStorage.setItem(LS_BIBLE_KEY, id); }}
        onSearch={() => setSearchOpen(true)}
        onToggleAudio={() => void readerAudio.toggle()}
        audioPlaying={readerAudio.playing}
        audioLoading={readerAudio.loading}
        audioDisabled={readerAudio.disabled}
        audioPlaybackRate={readerAudio.playbackRate}
        onCycleAudioSpeed={readerAudio.cycleSpeed}
        online={online}
        displayMode={displayMode}
        onToggleDisplayMode={toggleDisplayMode}
        readerDark={readerDark}
        onToggleReaderDark={toggleReaderDark}
        columnLayout={spreadColumnLayout}
        onToggleColumnLayout={readerSpread ? toggleColumnLayout : undefined}
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
            if (!v) {
              if (readerSpread) {
                lastSpreadAnchorKeyRef.current = "";
                setPendingSpreadEnd(false);
              } else {
                setChapterPage(0);
              }
            }
          } else {
            navigate(`/read/${b.abbr}/${c}`);
          }
        }}
        fontScale={fontScale}
        onFontScaleChange={updateFontScale}
        fontChoice={fontChoice}
        onFontChoiceChange={(choice) => void updateFontChoice(choice)}
        singlePage={compactChrome}
        settingsOpenRequest={settingsOpenRequest}
        inkMode={inkMode}
        onToggleInkMode={toggleInkMode}
        containedInHub={containedInHub}
        hubFullscreen={hubFullscreen}
        onToggleHubFullscreen={showHubShell ? toggleHubFullscreen : undefined}
        returnTo={readerReturn?.to}
        returnLabel={readerReturn?.label}
        onReturn={() => {
          clearReaderReturn();
          setReaderReturn(null);
        }}
      />

      {staleLayoutInk && inkMode ? (
        <div
          className={`${overlayPos} left-1/2 top-[calc(var(--safe-area-inset-top)+3.5rem)] z-[34] max-w-md -translate-x-1/2 rounded-lg border border-amber-200/80 bg-amber-50/95 px-3 py-2 text-center text-xs text-amber-950 shadow-sm backdrop-blur-sm`}
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
          compactInkLayout={compactInkLayout}
          onTool={setInkTool}
          onColor={setInkColor}
          onSize={setInkSize}
          onUndo={() => runInkAction("undo")}
          onRedo={() => runInkAction("redo")}
          onClear={() => runInkAction("clear")}
          onClearChapterInk={clearChapterInk}
        />
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          overlayPos,
          "inset-x-0 top-[calc(var(--safe-area-inset-top)+3.25rem)]",
          showReaderDock
            ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+env(safe-area-inset-bottom,0px))]"
            : "bottom-0",
        )}
      >
      <BookScene
        progress={progress}
        singlePage={!effectiveSpread}
        tabletPortrait={tabletPortrait}
        fillContainer
        pageSide="left"
        coverStyle={readerCoverStyle}
        coverClassName={readerCoverClass}
        pageClassName={readerPageClass}
        ribbons={
          focusMode ? null : (
            <Ribbons
              ribbons={bookmarks as RibbonData[]}
              anchor={effectiveSpread ? "gutter" : "spine"}
              swaying={false}
              onJump={(r) =>
                navigate(
                  `/read/${r.book}/${r.chapter}${r.verse ? `?v=${r.verse}` : ""}`,
                )
              }
              onAddAt={(p) => setBmDialog({ position: p })}
            />
          )
        }
        leftPage={
          scrollMode ? (
            renderPageSurface(chapterPage, "left")
          ) : (
          <SwipePage side="left" onTurn={goPage} inkMode={inkMode}>
            <PageFlip
              pageKey={
                effectiveSpread
                  ? `L-${book.abbr}-${chapter}-${leftIdx}`
                  : `P-${book.abbr}-${chapter}-${chapterPage}`
              }
              direction={flipDirection}
              side="left"
              enableSlide={!effectiveSpread}
            >
              {renderPageSurface(effectiveSpread ? leftIdx : chapterPage, "left")}
            </PageFlip>
          </SwipePage>
          )
        }
        rightPage={
          scrollMode ? (
            <div className="h-full w-full" aria-hidden />
          ) : effectiveSpread ? (
            <SwipePage side="right" onTurn={goPage} inkMode={inkMode}>
              <PageFlip
                pageKey={`R-${book.abbr}-${chapter}-${rightIdx}`}
                direction={flipDirection}
                side="right"
              >
                {renderPageSurface(rightIdx, "right")}
              </PageFlip>
            </SwipePage>
          ) : (
            <div className="h-full w-full" aria-hidden />
          )
        }
      />
      </div>

      {/* Page-turn hot zones — narrow strips at the screen edge */}
      {!scrollMode && (
        <>
      <button
        onClick={() => goPage(-1)}
        aria-label="Previous page"
        className={cn(
          overlayPos,
          "top-[calc(var(--safe-area-inset-top)+5rem)] left-0 w-8 z-[5] opacity-0",
          showReaderDock
            ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
            : "bottom-safe-16",
          inkMode && "pointer-events-none",
        )}
      />
      <button
        onClick={() => goPage(1)}
        aria-label="Next page"
        className={cn(
          overlayPos,
          "top-[calc(var(--safe-area-inset-top)+5rem)] right-0 w-8 z-[5] opacity-0",
          showReaderDock
            ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
            : "bottom-safe-16",
          inkMode && "pointer-events-none",
        )}
      />
        </>
      )}

      {/* Headless paginator — measures and reports splits (page mode only) */}
      {!scrollMode && useStreamReader && streamChapters.length > 0 && !!passage ? (
        <BookPaginator
          chapters={streamChapters}
          pageWidth={Math.max(180, pageBox.w)}
          pageHeight={Math.max(180, subsequentPageHeight || firstPageHeight || 480)}
          firstPageHeight={Math.max(180, paginatorFirstPageHeight || subsequentPageHeight || 480)}
          className={scriptureTypoClass}
          fontSizeStyle={paginatorFontStyle}
          columnsClassName={columnClassName}
          footerHeight={paginatorFooterHeight}
          spreadMode={effectiveSpread && useStreamReader}
          onSplitsChange={handleStreamSplitsChange}
        />
      ) : null}
      {!scrollMode && pageBox.w > 0 && subsequentPageHeight > 0 && verses.length > 0 && !useStreamReader ? (
        <Paginator
          verses={verses}
          paragraphStarts={paginatorParagraphStarts}
          headings={paginatorHeadings}
          bookAbbr={book.abbr}
          chapter={chapter}
          pageWidth={Math.max(180, pageBox.w)}
          pageHeight={Math.max(180, subsequentPageHeight)}
          firstPageHeight={Math.max(180, paginatorFirstPageHeight)}
          className={scriptureTypoClass}
          fontSizeStyle={paginatorFontStyle}
          columnsClassName={columnClassName}
          footerHeight={paginatorFooterHeight}
          onSplitsChange={handleSplitsChange}
        />
      ) : null}

      <AnimatePresence>
        {focusMode && readerSpread && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => setFocusMode(false)}
            className={`${overlayPos} bottom-safe-16 left-1/2 -translate-x-1/2 z-30 bg-leather/90 text-paper text-xs px-4 py-2 rounded-full backdrop-blur shadow-md`}
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
          if (!online) {
            toast({ variant: "destructive", title: "Companion needs internet", description: "Reconnect to use AI features." });
            return;
          }
          openCompanion(buildScope(tbSel.verses), "journal");
        }}
        onShare={() => {
          if (!tbSel) return;
          void sharePassageSelection(reference, passage ?? null, tbSel.verses);
        }}
        onClose={() => clearWindowSelection()}
      />

      <BibleSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} bibleId={bibleId} />

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
            setBookmark({
              position: bmDialog.position,
              label,
              color,
              book: book.abbr,
              chapter,
              verse: bookmarkVerse,
            });
            toast({
              title: "Ribbon saved",
              description: `${label} → ${book.name} ${chapter}:${bookmarkVerse}`,
            });
            setBmDialog(null);
          }}
        />
      )}

      {/* Anchor belief banner for this chapter */}
      {anchorBelief && !focusMode && (
        <button
          onClick={() => navigate(`/framework/beliefs/${anchorBelief.id}`)}
          className={`${overlayPos} top-14 left-1/2 -translate-x-1/2 z-30 max-w-[min(680px,92vw)] bg-paper border border-gold/50 rounded-full shadow-leather px-4 py-1.5 text-xs flex items-center gap-2 hover:bg-paper-warm transition`}
          title="Your anchor belief for this chapter"
        >
          <Sparkles className="w-3.5 h-3.5 text-leather shrink-0" />
          <span className="ink-text truncate">{anchorBelief.statement}</span>
        </button>
      )}

      {!focusMode && <CompanionPane />}

      {showReaderDock ? (
        <ReaderFloatingTabBar bibleTo={`/read/${book.abbr}/${chapter}`} />
      ) : null}
    </div>
  );
}
