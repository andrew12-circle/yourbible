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
import { LS_BIBLE_KEY, persistBibleSelection } from "@/lib/bible/storedBibleId";
import { splitJesusSpeechForChapter, type Segment as JesusSegment } from "@/lib/bible/redLetter";
import { ScripturePlate } from "@/components/bible/ScripturePlate";
import { platesForChapter } from "@/lib/bible/biblePlates";
import { Ribbons, type RibbonData } from "@/components/bible/Ribbons";
import { SelectionPencilOverlay } from "@/components/bible/SelectionPencilOverlay";
import { MarkerSvgFilter } from "@/components/bible/MarkerSvgFilter";
import { TopBar } from "@/components/bible/TopBar";
import { BookScene } from "@/components/bible/BookScene";
import { ReaderMobileChapterBar } from "@/components/bible/ReaderMobileChapterBar";
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
  isSpreadDoubleColumnSplitsReady,
  headingsForChapter,
  isStreamSplitsReady,
  paragraphStartsForChapter,
  poetryBlocksForChapter,
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
  readerPageTurnTopOffsetClass,
  readerSceneTopOffsetClass,
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
  readerColumnLayoutLabel,
  writeReaderColumnLayout,
  type ReaderColumnLayout,
} from "@/lib/bible/readerColumnLayout";
import { deriveReaderLayout } from "@/lib/bible/readerLayout";
import { pageHorizontalPadding } from "@/lib/bible/readerPageMargins";
import { readerColumnContentHeightPx } from "@/lib/bible/readerColumnMeasure";
import {
  renderScriptureParagraphNodes,
  wrapScriptureColumns,
  wrapHolmanStudyContent,
  HolmanPageFootnotes,
  type HolmanVerseGroup,
} from "@/lib/bible/readerScriptureRender";
import { resolveStudyLayout, readReaderStudyLayout, writeReaderStudyLayout, isStudyBibleEdition, type ReaderStudyLayoutPreference } from "@/lib/bible/readerStudyLayout";
import {
  formatReaderSourceLine,
  readerEditionAbbreviation,
} from "@/lib/bible/readerEditionAttribution";
import { holmanVerseGroupsForRenderedPage } from "@/lib/bible/holmanStudyLayout";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";
import { chapterStudyParseReliable } from "@/lib/bible/studyParseQuality";
import { BookIntroductionBlock } from "@/components/bible/BookIntroductionBlock";
import { ReaderSelectionChrome } from "@/pages/reader/ReaderSelectionChrome";
import { ReaderPageOverlays } from "@/pages/reader/ReaderPageOverlays";
import { createReaderVerseRenderer } from "@/lib/bible/readerVerseNode";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import { useReaderToolbarSelection } from "@/hooks/useReaderToolbarSelection";
import { useReaderSelectionMarks } from "@/hooks/useReaderSelectionMarks";
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
  const bibleEditionAbbr = useMemo(
    () => displayBibles.find((b) => b.id === bibleId)?.abbreviation,
    [displayBibles, bibleId],
  );
  const currentBible = useMemo(
    () => displayBibles.find((b) => b.id === bibleId),
    [displayBibles, bibleId],
  );
  const [studyLayoutPreference, setStudyLayoutPreference] = useState<ReaderStudyLayoutPreference>(
    () => readReaderStudyLayout(),
  );
  const effectiveStudyLayout = useMemo(
    () => resolveStudyLayout(studyLayoutPreference, bibleEditionAbbr),
    [studyLayoutPreference, bibleEditionAbbr],
  );
  const updateStudyLayoutPreference = useCallback((next: ReaderStudyLayoutPreference) => {
    setStudyLayoutPreference(next);
    writeReaderStudyLayout(next);
  }, []);
  const readerSourceLine = useMemo(
    () =>
      formatReaderSourceLine(
        currentBible,
        isStudyBibleEdition(bibleEditionAbbr) ? effectiveStudyLayout : null,
      ),
    [currentBible, bibleEditionAbbr, effectiveStudyLayout],
  );
  const {
    data: passage,
    isLoading: loadingPassage,
    isError: passageError,
  } = usePassage(bibleId, book.abbr, chapter, true, bibleEditionAbbr);
  const { data: bookIntro } = useBookIntroduction(bibleId, book.abbr, chapter);
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
    const nextEntry = bibles.find((b) => b.id === next);
    if (next && next !== bibleId) {
      setBibleId(next);
      persistBibleSelection(next, nextEntry?.abbreviation);
    } else if (!bibleId && next) {
      setBibleId(next);
      persistBibleSelection(next, nextEntry?.abbreviation);
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
    bibleEditionAbbr,
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

  const readerLayout = useMemo(
    () =>
      deriveReaderLayout({
        displayMode,
        spread: readerSpread,
        columnPreference: columnLayout,
      }),
    [displayMode, readerSpread, columnLayout],
  );
  const scrollMode = readerLayout.scrollMode;
  const effectiveSpread = readerLayout.spread;
  const spreadColumnLayout = readerLayout.columnLayout;
  const columnClassName = readerLayout.columnsClassName;
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
        fontScale: effectiveReaderFontScaleEm(fontScale, {
          desktopSpread: readerSpread,
          compactChrome,
        }),
        pageWidth: Math.max(180, pageBox.w),
        pageHeight: Math.max(180, pageBox.h),
        singlePage: !readerSpread,
        columnLayout: spreadColumnLayout,
      }),
    [bibleId, fontScale, pageBox.w, pageBox.h, readerSpread, spreadColumnLayout, compactChrome],
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
  useLayoutEffect(() => {
    articleElsRef.current = { first: null, rest: null };
    articleRoRef.current?.disconnect();
    articleRoRef.current = null;
  }, [book.abbr, chapter]);
  useEffect(() => {
    scheduleSyncPageMeasurements();
  }, [book.abbr, chapter, scheduleSyncPageMeasurements]);
  const verses = passage?.verses ?? [];
  const activeStudyLayout = useMemo(
    () => (chapterStudyParseReliable(verses) ? effectiveStudyLayout : "inline"),
    [verses, effectiveStudyLayout],
  );
  // Reset splits when chapter / typography changes.
  useEffect(() => {
    setSplits([0]);
    setStreamSplits([0]);
  }, [book.abbr, chapter, readerSpread, fontScale, fontChoice, spreadColumnLayout, activeStudyLayout, studyLayoutPreference, PASSAGE_PARSER_REVISION]);
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
            poetryBlocks: passage.poetryBlocks ?? [],
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
    ? `font-ethiopic ${READER_SCRIPTURE_SIZE} leading-[1.68] ink-text`
    : pageTypoClass(fontChoice);
  const paginatorFontStyle = useMemo(
    () => ({
      ...readerScriptureTypographyStyle(fontChoice, fontScale, {
        desktopSpread: readerSpread,
        compactChrome,
      }),
      fontFamily: scriptureFont,
      ["--reader-scripture-font-family" as string]: scriptureFont,
    }),
    [fontChoice, fontScale, scriptureFont, readerSpread, compactChrome],
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
  const { tbSel, setTbSel, tbSelRef, pinnedSelection, clearWindowSelection } =
    useReaderToolbarSelection(verseLengths, inkMode);
  const highlightColor =
    activeHighlightColor ||
    getPalette(profile?.highlight_palette ?? "classic").colors[0]?.cssVar ||
    "--hl-amber";
  const totalPagesInChapter = pageCountFromSplits(splits, verses.length);
  const splitsReady = isPageSplitsReady(splits, verses.length);
  const useBookSpread = readerSpread && !scrollMode && verses.length > 0;
  const useStreamReader = useBookSpread || (hasChapterPlates && !!passage);
  const useSpreadDoubleColumn = readerLayout.useSpreadPaginatorMeasure && useStreamReader;
  const navStreamSplits = streamSplits;
  const totalStreamPages =
    useSpreadDoubleColumn && readerStream.length > 2
      ? Math.max(2, streamPageCount(navStreamSplits, readerStream.length))
      : streamPageCount(navStreamSplits, readerStream.length);
  const streamSplitsReady = useSpreadDoubleColumn
    ? isSpreadDoubleColumnSplitsReady(streamSplits, readerStream.length)
    : isStreamSplitsReady(streamSplits, readerStream.length);
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
      for (let p = 0; p < navStreamSplits.length - 1; p++) {
        const slice = sliceReaderPage(readerStream, navStreamSplits, p);
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
    navStreamSplits,
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
        spreadPageForChapterEnd(readerStream, navStreamSplits, book.abbr, chapter),
      );
      setPendingSpreadEnd(false);
      return;
    }
    const startPage = spreadPageForChapterStart(
      readerStream,
      navStreamSplits,
      book.abbr,
      chapter,
    );
    if (useBookSpread) setSpreadPageIdx(startPage);
    else setChapterPage(startPage);
  }, [
    useStreamReader,
    useBookSpread,
    streamSplitsReady,
    navStreamSplits,
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

  const {
    applyHighlightToSelection,
    applyUnderlineToSelection,
    clearMarksOnSelection,
    noteOnSelection,
  } = useReaderSelectionMarks({
    pinnedSelection,
    clearWindowSelection,
    persistHighlightColor,
    setMarkTool,
    setMarkRanges,
    setMarks,
    verseLengths,
    ulFor,
    setNoteOpen,
  });

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

  const holmanNavigateRef = useCallback(
    (targetBook: string, targetChapter: number, targetVerse: number) => {
      navigate(`/read/${targetBook}/${targetChapter}?v=${targetVerse}`);
    },
    [navigate],
  );

  const renderVerse = useMemo(
    () =>
      createReaderVerseRenderer({
        bookAbbr: book.abbr,
        chapter,
        useBookSpread,
        studyLayout: activeStudyLayout,
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
      activeStudyLayout,
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
    resolvePoetryBlocks?: (bookAbbr: string, chapter: number) => import("@/lib/bible/api").PoetryBlock[],
  ) =>
    renderScriptureParagraphNodes(
      groups,
      resolveParagraphStarts,
      resolveHeading,
      renderVerse,
      resolvePoetryBlocks,
      { studyLayout: activeStudyLayout },
    );

  // JSX factory — not an inline component type (which would remount ink on every parent render).
  const renderPageSurface = (pageIdx: number, side: "left" | "right") => {
    const pageOutOfRange = !scrollMode && pageIdx >= totalPagesForNav;
    const splitsForPage =
      useStreamReader && streamSplitsReady
        ? navStreamSplits
        : !useStreamReader && splitsReady
          ? splits
          : null;
    const streamSlice =
      useStreamReader && !scrollMode && !pageOutOfRange && splitsForPage
        ? sliceReaderPage(readerStream, splitsForPage, pageIdx)
        : null;
    const slice =
      scrollMode || useStreamReader || pageOutOfRange || !splitsForPage
        ? null
        : pageVerseSlice(splitsForPage, pageIdx, verses);
    const pageContentReady = pageOutOfRange
      ? false
      : useStreamReader
        ? streamSplitsReady &&
          streamSlice != null &&
          (streamSlice.isPlatePage || streamSlice.verseGroups.length > 0)
        : splitsReady && slice != null && slice.length > 0;
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
    const showPaginationSpinner =
      paginationPending &&
      (scrollMode
        ? pageIdx === chapterPage
        : useBookSpread
          ? pageIdx === spreadPageIdx || pageIdx === spreadPageIdx + 1
          : pageIdx === chapterPage);
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
    const showBookIntro =
      pageChapter === 1 &&
      pageBookAbbr === book.abbr &&
      bookIntro?.html &&
      (scrollMode ? pageIdx === chapterPage : measuresFirstPage);
    if (scrollMode && pageIdx !== chapterPage) {
      return <div className="h-full min-h-0" aria-hidden />;
    }
    const holmanVerseGroups: HolmanVerseGroup[] = holmanVerseGroupsForRenderedPage({
      scrollMode,
      useStreamReader,
      streamChapters,
      chapter,
      verses,
      readerStream,
      navStreamSplits,
      pageIdx,
      streamSlice,
      slice,
    });
    const holmanFootnoteVerses = holmanVerseGroups.flatMap((group) => group.verses);
    const showHolmanConnections =
      activeStudyLayout === "holman" &&
      holmanVerseGroups.some((group) => group.verses.length > 0) &&
      (scrollMode || pageContentReady);
    const showHolmanFootnotes =
      activeStudyLayout === "holman" &&
      holmanFootnoteVerses.length > 0 &&
      (scrollMode || pageContentReady);
    const scriptureColumnHeightPx = pageContentReady
      ? readerColumnContentHeightPx({
          columnLayoutActive: !scrollMode && Boolean(columnClassName),
          measuresFirstPage,
          startsWithChapterHeader: streamSlice?.startsWithChapterHeader != null,
          firstPageHeight,
          pageHeight: pageBox.h,
          footerGuardPx: PAGINATOR_OVERFLOW_GUARD_PX,
          chapterHeaderReservePx: CHAPTER_HEADER_RESERVE_PX,
        })
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
          {side === "left" && readerSourceLine ? (
            <p
              className="mt-0.5 max-w-[18rem] text-[9px] leading-snug text-muted-foreground/50 font-system"
              title={readerSourceLine}
            >
              {readerSourceLine}
            </p>
          ) : null}
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
                    compactChrome,
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
              "relative flex-1 min-h-0 min-w-0 w-full",
              scrollMode
                ? cn(
                    "block overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide",
                    compactChrome &&
                      "pb-[calc(var(--reader-mobile-chapter-bar-h,2.5rem)+0.75rem)]",
                  )
                : "flex flex-col",
            )}
          >
            {showPaginationSpinner ? (
              <div
                className="absolute inset-0 z-[2] flex items-center justify-center bg-paper/40 pointer-events-none"
                aria-hidden
              >
                <Loader2 className="w-5 h-5 animate-spin text-leather/50" />
              </div>
            ) : null}
            <article
              key={
                attachMeasureRef
                  ? `${book.abbr}-${chapter}-measure-${side}`
                  : `${pageBookAbbr}-${pageChapter}-${pageIdx}-${side}`
              }
              ref={attachMeasureRef}
              data-reading-area
              aria-busy={!ready}
              className={cn(
                scrollMode ? "w-full" : "flex-1 min-h-0 w-full overflow-hidden",
                scriptureTypoClass,
                activeStudyLayout === "holman" && "reader-holman-study",
                inkMode ? "!select-none" : "selectable-text",
              )}
              style={{
                ...readerScriptureTypographyStyle(fontChoice, fontScale, {
                  desktopSpread: readerSpread,
                  compactChrome,
                }),
                fontFamily: scriptureFont,
                ["--reader-scripture-font-family" as string]: scriptureFont,
              }}
            >
              {showBookIntro ? (
                <BookIntroductionBlock title={bookIntro!.title} html={bookIntro!.html} />
              ) : null}
              {(() => {
                const scriptureContent =
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
                      (bookAbbr, ch) => poetryBlocksForChapter(streamChapters, bookAbbr, ch),
                    )
                  ) : scrollMode && verses.length > 0 ? (
                    scriptureNodes(
                      [{ bookAbbr: book.abbr, chapter, verses }],
                      () => paragraphStarts,
                      () => headingByVerse,
                      () => passage?.poetryBlocks ?? [],
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
                      (bookAbbr, ch) => poetryBlocksForChapter(streamChapters, bookAbbr, ch),
                    )
                  ) : slice && slice.length > 0 ? (
                    scriptureNodes(
                      [{ bookAbbr: book.abbr, chapter, verses: slice }],
                      () => paragraphStarts,
                      () => headingByVerse,
                      () => passage?.poetryBlocks ?? [],
                    )
                  ) : null;

                if (activeStudyLayout === "holman") {
                  return wrapHolmanStudyContent(
                    spreadColumnLayout,
                    scrollMode,
                    scriptureContent,
                    holmanVerseGroups,
                    showHolmanFootnotes ? (
                      <HolmanPageFootnotes verses={holmanFootnoteVerses} />
                    ) : null,
                    showHolmanConnections,
                    scrollMode ? undefined : scriptureColumnHeightPx,
                    holmanNavigateRef,
                  );
                }

                return wrapScriptureColumns(
                  spreadColumnLayout,
                  scrollMode,
                  scriptureContent,
                  scriptureColumnHeightPx,
                );
              })()}
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
        {!focusMode && !scrollMode && !compactChrome ? (
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
            <span className="inline-flex items-center gap-1 flex-wrap justify-center">
              <button
                type="button"
                onClick={openReaderSettings}
                className="hover:text-muted-foreground transition-colors"
                aria-label={`${pageBookName} — open reader settings`}
              >
                {pageBookName}
              </button>
              {readerEditionAbbreviation(currentBible) ? (
                <>
                  <span aria-hidden>·</span>
                  <span title={currentBible?.name}>{readerEditionAbbreviation(currentBible)}</span>
                </>
              ) : null}
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
  const rightIdx = activePageIdx + 1;
  const subsequentPageHeight = pageBox.h > 0 ? pageBox.h : 0;
  const paginatorFirstPageHeight =
    firstPageHeight > 0 ? firstPageHeight : subsequentPageHeight;
  const paginatorReady =
    pageBox.w > 0 && (subsequentPageHeight > 0 || paginatorFirstPageHeight > 0);

  const atFirstPage = activePageIdx <= 0;
  const atLastPage = activePageIdx >= Math.max(0, totalPagesForNav - pagesPerTurn);
  const canGoBackMobile = scrollMode ? prevChapterRef != null : !atFirstPage || prevChapterRef != null;
  const canGoForwardMobile = scrollMode ? nextChapterRef != null : !atLastPage || nextChapterRef != null;
  const handleMobileNavBack = () => {
    if (scrollMode) {
      if (prevChapterRef) navigate(`/read/${prevChapterRef.book.abbr}/${prevChapterRef.chapter}`);
      return;
    }
    goPage(-1);
  };
  const handleMobileNavForward = () => {
    if (scrollMode) {
      if (nextChapterRef) navigate(`/read/${nextChapterRef.book.abbr}/${nextChapterRef.chapter}`);
      return;
    }
    goPage(1);
  };
  const spreadNudgeRight = compactChrome && !scrollMode && activePageIdx > 0;
  const showReaderDock = !showHubShell && compactChrome && !focusMode;
  const mobileChromeBottom = showReaderDock
    ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px))]"
    : compactChrome
      ? "bottom-[calc(var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px))]"
      : "bottom-0";

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!loading && user && needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  const hubEmbedded = showHubShell;

  return (
    <div
      data-bible-reader
      data-cropped-spread={!effectiveSpread ? "" : undefined}
      data-hub-fullscreen={hubFullscreen || undefined}
      className={cn(
        "relative transition-all duration-700 overflow-hidden",
        (containedInHub || !showHubShell || hubFullscreen) && "flex h-full min-h-0 flex-col",
        showHubShell && hubFullscreen && "fixed inset-0 z-[100] min-h-0 h-[100dvh] bg-fabric",
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
        onChangeBible={(id) => {
          setBibleId(id);
          persistBibleSelection(id, displayBibles.find((b) => b.id === id)?.abbreviation);
        }}
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
        columnLayout={columnLayout}
        onToggleColumnLayout={!scrollMode ? toggleColumnLayout : undefined}
        studyLayoutPreference={studyLayoutPreference}
        onStudyLayoutPreferenceChange={updateStudyLayoutPreference}
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
        hubCompactChrome={showHubShell}
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
          "inset-x-0",
          readerSceneTopOffsetClass(compactChrome, showHubShell),
          mobileChromeBottom,
        )}
      >
      <BookScene
        progress={progress}
        singlePage={!effectiveSpread}
        tabletPortrait={tabletPortrait}
        fillContainer
        hubEmbedded={hubEmbedded}
        coverStyle={readerCoverStyle}
        coverClassName={readerCoverClass}
        pageClassName={readerPageClass}
        spreadNudgeRight={spreadNudgeRight}
        ribbons={
          focusMode ? null : (
            <Ribbons
              ribbons={bookmarks as RibbonData[]}
              anchor="gutter"
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
            renderPageSurface(rightIdx, "right")
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
          readerPageTurnTopOffsetClass(compactChrome, showHubShell),
          "left-0 w-8 z-[5] opacity-0",
          showReaderDock
            ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
            : compactChrome
              ? "bottom-[calc(var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
              : "bottom-safe-16",
          inkMode && "pointer-events-none",
        )}
      />
      <button
        onClick={() => goPage(1)}
        aria-label="Next page"
        className={cn(
          overlayPos,
          readerPageTurnTopOffsetClass(compactChrome, showHubShell),
          "right-0 w-8 z-[5] opacity-0",
          showReaderDock
            ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
            : compactChrome
              ? "bottom-[calc(var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
              : "bottom-safe-16",
          inkMode && "pointer-events-none",
        )}
      />
        </>
      )}

      {/* Headless paginator — measures and reports splits (page mode only) */}
      {!scrollMode && paginatorReady && useStreamReader && streamChapters.length > 0 && !!passage ? (
        <BookPaginator
          chapters={streamChapters}
          pageWidth={pageBox.w}
          pageHeight={Math.max(180, subsequentPageHeight || paginatorFirstPageHeight)}
          firstPageHeight={Math.max(180, paginatorFirstPageHeight || subsequentPageHeight)}
          className={scriptureTypoClass}
          fontSizeStyle={paginatorFontStyle}
          columnsClassName={columnClassName}
          footerHeight={paginatorFooterHeight}
          spreadMode={readerLayout.useSpreadPaginatorMeasure && useStreamReader}
          studyLayout={activeStudyLayout}
          onSplitsChange={handleStreamSplitsChange}
        />
      ) : null}
      {!scrollMode && paginatorReady && pageBox.w > 0 && subsequentPageHeight > 0 && verses.length > 0 && !useStreamReader ? (
        <Paginator
          verses={verses}
          paragraphStarts={paginatorParagraphStarts}
          headings={paginatorHeadings}
          bookAbbr={book.abbr}
          chapter={chapter}
          pageWidth={pageBox.w}
          pageHeight={Math.max(180, subsequentPageHeight)}
          firstPageHeight={Math.max(180, paginatorFirstPageHeight)}
          className={scriptureTypoClass}
          fontSizeStyle={paginatorFontStyle}
          columnsClassName={columnClassName}
          footerHeight={paginatorFooterHeight}
          studyLayout={activeStudyLayout}
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

      {compactChrome && !focusMode ? (
        <ReaderMobileChapterBar
          bookName={book.name}
          chapter={chapter}
          scrollMode={scrollMode}
          canGoBack={canGoBackMobile}
          canGoForward={canGoForwardMobile}
          onBack={handleMobileNavBack}
          onForward={handleMobileNavForward}
          onOpenSettings={openReaderSettings}
        />
      ) : null}

      <ReaderPageOverlays
        overlayPos={overlayPos}
        focusMode={focusMode}
        readerSpread={readerSpread}
        setFocusMode={setFocusMode}
        activeVerse={activeVerse}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        book={book}
        chapter={chapter}
        noteOpen={noteOpen}
        setNoteOpen={setNoteOpen}
        noteFor={noteFor}
        upsertNote={upsertNote}
        deleteNote={deleteNote}
        bmDialog={bmDialog}
        setBmDialog={setBmDialog}
        bookmarkVerse={bookmarkVerse}
        bookmarks={bookmarks}
        setBookmark={setBookmark}
        toast={toast}
        anchorBelief={anchorBelief}
        showReaderDock={showReaderDock}
      />

      {/* Live pencil underline that tracks the current text selection */}
      <SelectionPencilOverlay enabled={!inkMode} />

      {/* Toolbar that appears above the user's selection. Highlighter swatches,
          a pen for underlining, a note shortcut, and a clear control. */}
      <ReaderSelectionChrome
        tbSel={tbSel}
        inkMode={inkMode}
        paletteId={profile?.highlight_palette ?? "classic"}
        highlightColor={highlightColor}
        hlFor={hlFor}
        ulFor={ulFor}
        onPickHighlight={applyHighlightToSelection}
        onActiveColorChange={persistHighlightColor}
        onPickUnderline={applyUnderlineToSelection}
        onClear={clearMarksOnSelection}
        onNote={noteOnSelection}
        book={book}
        chapter={chapter}
        verses={verses}
        passage={passage}
        bibleId={bibleId}
        reference={reference}
        online={online}
        openCompanion={openCompanion}
        buildScope={buildScope}
        clearWindowSelection={clearWindowSelection}
      />

      <BibleSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} bibleId={bibleId} />
    </div>
  );
}
