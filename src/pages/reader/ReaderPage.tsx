import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
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
import {
  getStoredBibleId,
  getStoredBibleIdOrDefault,
  persistBibleSelection,
} from "@/lib/bible/storedBibleId";
import { splitJesusSpeechForChapter, type Segment as JesusSegment } from "@/lib/bible/redLetter";
import { ReaderPageHeader, ReaderPageFooter, ReaderPageBodyPlaceholder } from "@/pages/reader/ReaderPageChrome";
import { renderReaderPageScripture } from "@/pages/reader/renderReaderPageScripture";
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
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  clearReaderReturn,
  MORNING_FORMULA_SCRIPTURE_RETURN,
  persistReaderReturn,
  readReaderReturn,
  readerReturnFromState,
  type ReaderNavigationState,
} from "@/lib/bible/readerNavigation";
import {
  pauseMorningScriptureTimer,
  startMorningScriptureTimer,
} from "@/lib/livingHope/morningScriptureTimer";
import { useCompanion, companionStudyPageSide } from "@/lib/reader/companionStore";
import { supabase } from "@/integrations/supabase/client";
import ReaderInkLayer, {
  type ReaderInkLayerApi,
  type ReaderInkLayerState,
} from "@/components/bible/ReaderInkLayer";
import { ReaderInkToolbar } from "@/components/bible/ReaderInkToolbar";
import { useReaderInkMode } from "@/hooks/useReaderPageInk";
import { computeReaderLayoutFingerprint } from "@/lib/ink/layoutFingerprint";
import { clearReaderInkChapter } from "@/lib/ink/readerInkChapterClear";
import { INK_PEN_SIZES } from "@/lib/ink/strokeRender";
import type { InkTool } from "@/lib/ink/types";

const READER_INK_DEFAULT_TOOL: InkTool = "fineline";
const READER_INK_DEFAULT_COLOR = "#007aff";
const READER_INK_DEFAULT_SIZE = INK_PEN_SIZES[0];
import {
  areSameSplits,
  isPageSplitsReady,
  pageCountFromSplits,
  pageVerseSlice,
} from "@/lib/bible/pageSplits";
import { readerChapterPageNumber } from "@/lib/bible/bibleContents";
import { getNextChapterRef, getPrevChapterRef } from "@/lib/bible/chapterNav";
import { buildAdjacentStreamChapters, passageToStreamChapter, streamChapterCompositionKey } from "@/lib/bible/readerStreamChapters";
import {
  areSameStreamSplits,
  buildReaderStream,
  READER_PAGINATOR_SPLIT_REVISION,
  sliceReaderPage,
  findSpreadPageForVerse,
  interimSpreadDisplaySplits,
  isSpreadDoubleColumnSplitsReady,
  isStreamSplitsReady,
  sliceReaderSpreadPane,
  spreadPageForChapterEnd,
  spreadPageForChapterStart,
  spreadPageForChapterStartLeftPane,
} from "@/lib/bible/readerStream";
import { useAdjacentPassages } from "@/hooks/useAdjacentPassages";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import {
  hubReaderInline,
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
import {
  readerPageHeightsPx,
  READER_COLUMN_FOOTER_GUARD_PX,
  READER_LIVE_COLUMN_SAFETY_PX,
} from "@/lib/bible/readerColumnMeasure";
import { type HolmanVerseGroup } from "@/lib/bible/readerScriptureRender";
import { resolveStudyLayout, readReaderStudyLayout, writeReaderStudyLayout, isStudyBibleEdition, type ReaderStudyLayoutPreference } from "@/lib/bible/readerStudyLayout";
import { formatReaderSourceLine } from "@/lib/bible/readerEditionAttribution";
import {
  holmanVerseGroupsForRenderedPage,
  readerPageFootnotesEnabled,
  versesHavePageFootnotes,
} from "@/lib/bible/holmanStudyLayout";
import { PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";
import { chapterStudyParseReliable } from "@/lib/bible/studyParseQuality";
import { BookIntroductionBlock } from "@/components/bible/BookIntroductionBlock";
import { ReaderSelectionChrome } from "@/pages/reader/ReaderSelectionChrome";
import { ReaderPageOverlays } from "@/pages/reader/ReaderPageOverlays";
import { useReaderPagination } from "@/hooks/useReaderPagination";
import { useReaderPageMeasurement } from "@/hooks/useReaderPageMeasurement";
import { useReaderChapterMedia } from "@/hooks/useReaderChapterMedia";
import { ReaderShell } from "@/pages/reader/ReaderShell";
import { ReaderSpreadStudyPane } from "@/pages/reader/ReaderSpreadStudyPane";
import { readerPageSideFromRect } from "@/lib/bible/verseSelection";
import { buildDocumentBlocks } from "@/lib/bible/documentModel";
import { passageToCanonicalChapter } from "@/lib/bible/canonical/passageToCanonical";
import { createReaderVerseRenderer } from "@/lib/bible/readerVerseNode";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import { useReaderToolbarSelection } from "@/hooks/useReaderToolbarSelection";
import { useReaderSelectionMarks } from "@/hooks/useReaderSelectionMarks";
import { useBibleScrollWheel } from "@/hooks/useBibleScrollWheel";

const LS_HIGHLIGHT_COLOR_KEY = "yb.highlightColor";
const CHAPTER_HEADER_RESERVE_PX = 96;
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

  useEffect(() => {
    const to = readerReturn?.to ?? "";
    const fromMorningScripture =
      to.startsWith("/living-hope/review") &&
      (to.includes("step=scripture") || to === MORNING_FORMULA_SCRIPTURE_RETURN);
    if (!fromMorningScripture) return;
    startMorningScriptureTimer();
    return () => pauseMorningScriptureTimer();
  }, [readerReturn?.to]);

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
  const [bibleId, setBibleId] = useState<string>(() => getStoredBibleIdOrDefault());
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
  const {
    chapterContextOpen,
    setChapterContextOpen,
    chapterCtx,
    showChapterContext,
    hasInlinePlates,
    inlineChapterPlates,
  } = useReaderChapterMedia(book.abbr, chapter);
  const readerAudio = useReaderAudio(reference, passage);
  useRecordReadingActivity(user?.id, book.abbr, chapter);

  useEffect(() => {
    if (readCanon() === "ethiopian") {
      if (bibleId !== EOTC_BIBLE_ID) {
        setBibleId(EOTC_BIBLE_ID);
        persistBibleSelection(EOTC_BIBLE_ID, "EOTC");
      }
      return;
    }
    if (bibles.length === 0) return;
    const next = pickDefaultBibleId(bibles, bibleId || getStoredBibleId());
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
  const [activeHighlightColor, setActiveHighlightColor] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_HIGHLIGHT_COLOR_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [_markTool, setMarkTool] = useState<"highlight" | "underline">("highlight");
  const [noteOpen, setNoteOpen] = useState<{ verse: number } | null>(null);
  const [bmDialog, setBmDialog] = useState<{ position: 1 | 2 | 3 } | null>(null);
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
  const readerFontLayout = useMemo(
    () => ({ desktopSpread: readerSpread, compactChrome, tabletPortrait }),
    [readerSpread, compactChrome, tabletPortrait],
  );
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
  const [inkTool, setInkTool] = useState<InkTool>(READER_INK_DEFAULT_TOOL);
  const [inkColor, setInkColor] = useState(READER_INK_DEFAULT_COLOR);
  const [inkSize, setInkSize] = useState<number>(READER_INK_DEFAULT_SIZE);
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

  useEffect(() => {
    try { localStorage.setItem("yb_last_read", `${book.abbr}/${chapter}`); } catch { /* ignore */ }
  }, [book.abbr, chapter]);

  const { progress } = useMemo(() => {
    const total = canonBooks.reduce((s, b) => s + b.chapters, 0);
    let before = 0;
    for (const b of canonBooks) {
      if (b.abbr === book.abbr) break;
      before += b.chapters;
    }
    return {
      progress: Math.max(0, Math.min(1, (before + chapter - 1) / Math.max(1, total - 1))),
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

  const { open: companionOpen, anchorPageSide } = useCompanion();
  const spreadStudyActive =
    companionOpen && effectiveSpread && !scrollMode && !compactChrome && !focusMode;
  const studyPageSide = companionStudyPageSide(anchorPageSide);
  const setAnchorPageSide = useCompanion((s) => s.setAnchorPageSide);

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

  const {
    pageBox,
    firstPageHeight,
    subsequentPageHeight,
    paginatorFirstPageHeight,
    paginatorReady,
    onMeasureFirstRef,
    onMeasureRestRef,
    lockPageFlip,
  } = useReaderPageMeasurement(book.abbr, chapter);
  const layoutFingerprint = useMemo(
    () =>
      computeReaderLayoutFingerprint({
        bibleId: bibleId || "default",
        fontScale: effectiveReaderFontScaleEm(fontScale, readerFontLayout),
        pageWidth: Math.max(180, pageBox.w),
        pageHeight: Math.max(180, pageBox.h),
        singlePage: !readerSpread,
        columnLayout: spreadColumnLayout,
      }),
    [bibleId, fontScale, pageBox.w, pageBox.h, readerSpread, spreadColumnLayout, readerFontLayout],
  );

  useEffect(() => {
    setStaleLayoutInk(false);
  }, [layoutFingerprint]);

  const [splits, setSplits] = useState<number[]>([0]);
  const [streamSplits, setStreamSplits] = useState<number[]>([0]);
  const handleSplitsChange = useCallback((next: number[]) => {
    setSplits((prev) => (areSameSplits(prev, next) ? prev : next));
  }, []);
  const handleStreamSplitsChange = useCallback((next: number[]) => {
    setStreamSplits((prev) => (areSameStreamSplits(prev, next) ? prev : next));
  }, []);
  const verses = passage?.verses ?? [];
  const activeStudyLayout = useMemo(
    () => (chapterStudyParseReliable(verses) ? effectiveStudyLayout : "inline"),
    [verses, effectiveStudyLayout],
  );
  useEffect(() => {
    setSplits([0]);
    setStreamSplits([0]);
  }, [book.abbr, chapter, readerSpread, fontScale, fontChoice, spreadColumnLayout, activeStudyLayout, studyLayoutPreference, PASSAGE_PARSER_REVISION, READER_PAGINATOR_SPLIT_REVISION]);
  const streamChapters = useMemo(
    () => {
      if (readerSpread) {
        if (!adjacentPassages.streamReady) {
          const current = passageToStreamChapter(
            book.abbr,
            book.name,
            chapter,
            adjacentPassages.current ?? passage,
          );
          return current ? [current] : [];
        }
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
      if (hasInlinePlates && passage) {
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
      hasInlinePlates,
      adjacentPassages.prevRef,
      adjacentPassages.prev,
      adjacentPassages.current,
      adjacentPassages.next,
      adjacentPassages.nextRef,
      adjacentPassages.streamReady,
      book.abbr,
      book.name,
      chapter,
      passage,
    ],
  );
  const plateFocus = useMemo(
    () => ({ bookAbbr: book.abbr, chapter }),
    [book.abbr, chapter],
  );
  const readerStream = useMemo(
    () =>
      streamChapters.length > 0
        ? buildReaderStream(streamChapters, { plateFocus })
        : [],
    [streamChapters, plateFocus],
  );
  const streamCompositionKey = useMemo(
    () => streamChapterCompositionKey(streamChapters),
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
      ...readerScriptureTypographyStyle(fontChoice, fontScale, readerFontLayout),
      fontFamily: scriptureFont,
      ["--reader-scripture-font-family" as string]: scriptureFont,
    }),
    [fontChoice, fontScale, scriptureFont, readerFontLayout],
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

  useEffect(() => {
    if (!spreadStudyActive || !tbSel?.pageSide) return;
    setAnchorPageSide(tbSel.pageSide);
  }, [spreadStudyActive, tbSel?.pageSide, setAnchorPageSide]);
  const highlightColor =
    activeHighlightColor ||
    getPalette(profile?.highlight_palette ?? "classic").colors[0]?.cssVar ||
    "--hl-amber";
  const totalPagesInChapter = pageCountFromSplits(splits, verses.length);
  const splitsReady = isPageSplitsReady(splits, verses.length);
  const useBookSpread = readerSpread && !scrollMode && verses.length > 0;
  const useStreamReader = useBookSpread || (hasInlinePlates && !!passage);
  const useSpreadDoubleColumn = readerLayout.useSpreadPaginatorMeasure && useStreamReader;
  const { navStreamSplits, streamSplitsReady, totalStreamPages } = useReaderPagination({
    useBookSpread,
    useStreamReader,
    useSpreadDoubleColumn,
    streamSplits,
    readerStream,
  });
  const displayStreamSplits = useMemo(() => {
    if (!useSpreadDoubleColumn || !useBookSpread) return navStreamSplits;
    if (streamSplitsReady) return navStreamSplits;
    return interimSpreadDisplaySplits(navStreamSplits, readerStream);
  }, [
    useSpreadDoubleColumn,
    useBookSpread,
    streamSplitsReady,
    navStreamSplits,
    readerStream,
  ]);
  const spreadPanesRenderable =
    !useSpreadDoubleColumn ||
    !useBookSpread ||
    isSpreadDoubleColumnSplitsReady(displayStreamSplits, readerStream.length);
  const paginatorFooterHeight = READER_COLUMN_FOOTER_GUARD_PX;
  const totalPagesForNav = useStreamReader ? totalStreamPages : totalPagesInChapter;

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

  const [chapterPage, setChapterPage] = useState(0);
  const [spreadPageIdx, setSpreadPageIdx] = useState(0);
  const [pendingSpreadEnd, setPendingSpreadEnd] = useState(false);
  const skipSpreadUrlSyncRef = useRef(true);
  const lastSpreadAnchorKeyRef = useRef("");
  const spreadReadingAnchorRef = useRef<{ bookAbbr: string; chapter: number; verse: number } | null>(
    null,
  );
  const lastStreamCompositionKeyRef = useRef("");
  const [flipDirection, setFlipDirection] = useState<"forward" | "back">("forward");
  useEffect(() => {
    setChapterPage(0);
    setSpreadPageIdx(0);
    setPendingSpreadEnd(false);
    skipSpreadUrlSyncRef.current = true;
    lastSpreadAnchorKeyRef.current = "";
    spreadReadingAnchorRef.current = null;
    lastStreamCompositionKeyRef.current = "";
  }, [book.abbr, chapter, fontScale, spreadColumnLayout]);

  useEffect(() => {
    if (lastStreamCompositionKeyRef.current === streamCompositionKey) return;
    lastStreamCompositionKeyRef.current = streamCompositionKey;
    setStreamSplits([0]);
    lastSpreadAnchorKeyRef.current = "";
  }, [streamCompositionKey]);

  useEffect(() => {
    if (readerStream.length === 0) return;
    if (!isStreamSplitsReady(streamSplits, readerStream.length)) {
      setStreamSplits((prev) => (prev.length === 1 && prev[0] === 0 ? prev : [0]));
    }
  }, [readerStream.length, streamCompositionKey, streamSplits]);

  useEffect(() => {
    if (!useBookSpread || !streamSplitsReady || !spreadReadingAnchorRef.current) return;
    const anchor = spreadReadingAnchorRef.current;
    const target = findSpreadPageForVerse(
      readerStream,
      navStreamSplits,
      anchor.bookAbbr,
      anchor.chapter,
      anchor.verse,
    );
    setSpreadPageIdx((prev) => (prev === target ? prev : target));
  }, [streamCompositionKey, streamSplitsReady, navStreamSplits, readerStream, useBookSpread]);

  useEffect(() => {
    if (!useBookSpread || !streamSplitsReady) return;
    const left = sliceReaderSpreadPane(
      readerStream,
      navStreamSplits,
      spreadPageIdx,
      "left",
      readerStream.length,
    );
    const lastGroup = left?.verseGroups.at(-1);
    const lastVerse = lastGroup?.verses.at(-1);
    if (lastGroup && lastVerse) {
      spreadReadingAnchorRef.current = {
        bookAbbr: lastGroup.bookAbbr,
        chapter: lastGroup.chapter,
        verse: lastVerse.number,
      };
    }
  }, [
    useBookSpread,
    streamSplitsReady,
    spreadPageIdx,
    navStreamSplits,
    readerStream,
  ]);

  useEffect(() => {
    if (!scrollMode) return;
    const el = document.querySelector<HTMLElement>("[data-ink-anchor]");
    el?.scrollTo(0, 0);
  }, [book.abbr, chapter, scrollMode]);

  useBibleScrollWheel(scrollMode, `${book.abbr}-${chapter}`);

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
      if (useBookSpread && useSpreadDoubleColumn) {
        let leftPaneTarget = -1;
        let anyTarget = 0;
        for (let p = 0; p < navStreamSplits.length - 1; p += 2) {
          const left = sliceReaderSpreadPane(
            readerStream,
            navStreamSplits,
            p,
            "left",
            readerStream.length,
          );
          const onLeft = left?.verseGroups.some(
            (g) =>
              g.bookAbbr === book.abbr &&
              g.chapter === chapter &&
              g.verses.some((v) => v.number === pendingVerse),
          );
          if (onLeft && leftPaneTarget < 0) leftPaneTarget = p;
          for (const side of ["left", "right"] as const) {
            const slice = sliceReaderSpreadPane(
              readerStream,
              navStreamSplits,
              p,
              side,
              readerStream.length,
            );
            const containsVerse = slice?.verseGroups.some(
              (g) =>
                g.bookAbbr === book.abbr &&
                g.chapter === chapter &&
                g.verses.some((v) => v.number === pendingVerse),
            );
            if (containsVerse) anyTarget = p;
          }
        }
        target = leftPaneTarget >= 0 ? leftPaneTarget : anyTarget;
      } else if (useBookSpread) {
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
      }
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
    useSpreadDoubleColumn,
    book.abbr,
    chapter,
  ]);

  useEffect(() => {
    if (!useStreamReader || !streamSplitsReady || pendingVerse != null) return;
    const anchorKey = `${book.abbr}|${chapter}|${pendingSpreadEnd ? "end" : "start"}`;
    const needsAnchor = lastSpreadAnchorKeyRef.current !== anchorKey;
    if (!needsAnchor) return;
    lastSpreadAnchorKeyRef.current = anchorKey;
    spreadReadingAnchorRef.current = null;
    if (useBookSpread && pendingSpreadEnd) {
      setSpreadPageIdx(
        spreadPageForChapterEnd(readerStream, navStreamSplits, book.abbr, chapter),
      );
      setPendingSpreadEnd(false);
      return;
    }
    const startPage = useSpreadDoubleColumn
      ? spreadPageForChapterStartLeftPane(
          readerStream,
          navStreamSplits,
          book.abbr,
          chapter,
        )
      : spreadPageForChapterStart(
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
    useSpreadDoubleColumn,
  ]);

  const pagesPerTurn = effectiveSpread ? 2 : 1;

  const goPage = (delta: number) => {
    lockPageFlip();
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
      if (!streamSplitsReady) {
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
    noteOnSelection: noteOnSelectionBase,
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

  const noteOnSelection = useCallback(() => {
    const sel = pinnedSelection();
    if (!sel) return;
    if (effectiveSpread && !scrollMode && !compactChrome) {
      const pageSide = sel.pageSide ?? readerPageSideFromRect(sel.rect);
      openCompanion(buildScope(sel.verses), "journal", pageSide);
      return;
    }
    noteOnSelectionBase();
  }, [
    pinnedSelection,
    effectiveSpread,
    scrollMode,
    compactChrome,
    openCompanion,
    buildScope,
    noteOnSelectionBase,
  ]);

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

  const scrollDocumentBlocks = useMemo(() => {
    if (!scrollMode || !passage) return [];
    const record = passageToCanonicalChapter(passage, book.abbr, chapter, bibleId);
    return buildDocumentBlocks(record.verses, record.layout, redSegments, bibleId);
  }, [scrollMode, passage, book.abbr, chapter, bibleId, redSegments]);

  const renderVerse = useMemo(
    () =>
      createReaderVerseRenderer({
        bibleId,
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
      bibleId,
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

  const renderPageSurface = (pageIdx: number, side: "left" | "right") => {
    if (spreadStudyActive && side === studyPageSide) {
      const sel = tbSel;
      return (
        <ReaderSpreadStudyPane
          side={side}
          paletteId={profile?.highlight_palette ?? "classic"}
          highlightColor={highlightColor}
          currentColor={sel ? hlFor(sel.verses[0])?.color ?? null : null}
          currentlyUnderlined={!!sel && sel.verses.every((v) => !!ulFor(v))}
          onPickHighlight={applyHighlightToSelection}
          onActiveColorChange={persistHighlightColor}
          onPickUnderline={applyUnderlineToSelection}
          onClear={clearMarksOnSelection}
          pageClassName={readerPageClass}
        />
      );
    }

    const pageOutOfRange = !scrollMode && pageIdx >= totalPagesForNav;
    const splitsForPage =
      useStreamReader && displayStreamSplits.length >= 2
        ? displayStreamSplits
        : !useStreamReader && splitsReady
          ? splits
          : null;
    const streamSlice =
      useStreamReader && !scrollMode && !pageOutOfRange && splitsForPage
        ? useSpreadDoubleColumn && useBookSpread
          ? spreadPanesRenderable
            ? sliceReaderSpreadPane(
                readerStream,
                splitsForPage,
                spreadPageIdx,
                side,
                readerStream.length,
              )
            : null
          : sliceReaderPage(readerStream, splitsForPage, pageIdx)
        : null;
    const slice =
      scrollMode || useStreamReader || pageOutOfRange || !splitsForPage
        ? null
        : pageVerseSlice(splitsForPage, pageIdx, verses);
    const pageContentReady = pageOutOfRange
      ? false
      : useStreamReader
        ? streamSlice != null &&
          (streamSlice.isPlatePage || streamSlice.verseGroups.length > 0)
        : splitsReady && slice != null && slice.length > 0;
    const activePageIdx = useBookSpread ? spreadPageIdx : chapterPage;
    const pagePrimary = streamSlice?.primaryChapter;
    const pageBookAbbr = pagePrimary?.bookAbbr ?? book.abbr;
    const pageBookName = pagePrimary?.bookName ?? book.name;
    const pageChapter = pagePrimary?.chapter ?? chapter;
    const pageStartsWithChapterHeader = streamSlice?.startsWithChapterHeader != null;
    const streamPaginatorPageIdx =
      useSpreadDoubleColumn && useBookSpread
        ? spreadPageIdx + (side === "left" ? 0 : 1)
        : pageIdx;
    const paginatorPageIndex = streamPaginatorPageIdx;
    const measuresFirstPage = paginatorPageIndex === 0 && pageStartsWithChapterHeader;
    const isCurrentLeftPage = side === "left" && pageIdx === activePageIdx;
    const spreadRightPageIdx = useSpreadDoubleColumn ? spreadPageIdx : spreadPageIdx + 1;
    const isOpeningRightPage =
      useBookSpread
        ? side === "right" && pageIdx === spreadRightPageIdx
        : readerSpread && chapterPage === 0 && pageIdx === 1 && side === "right";
    const measuresRestPage =
      isOpeningRightPage ||
      (isCurrentLeftPage && !measuresFirstPage);
    const globalPage = readerChapterPageNumber(pageBookAbbr, pageChapter);
    const inkLayerId = `${pageBookAbbr}-${pageChapter}-${pageIdx}-${side}`;
    const pageLoading = loadingPassage && verses.length === 0;
    const ready = scrollMode || pageContentReady;
    const attachMeasureRef = effectiveSpread
      ? side === "left" && pageIdx === spreadPageIdx
        ? onMeasureFirstRef
        : side === "right" &&
            pageIdx === spreadRightPageIdx
          ? onMeasureRestRef
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
    const showHolmanConnections = false;
    const showPageFootnotes =
      readerPageFootnotesEnabled(scrollMode) &&
      versesHavePageFootnotes(holmanFootnoteVerses);
    const useStudyPageStack = activeStudyLayout === "holman" || showPageFootnotes;
    const { stackContentHeightPx, scriptureColumnHeightPx } = readerPageHeightsPx({
      pageContentReady,
      hasStreamSlice: streamSlice != null,
      scrollMode,
      columnLayoutActive: Boolean(columnClassName),
      pageIndex: paginatorPageIndex,
      startsWithChapterHeader: pageStartsWithChapterHeader,
      firstPageHeight,
      pageHeight: pageBox.h,
      footerGuardPx: READER_COLUMN_FOOTER_GUARD_PX,
      chapterHeaderReservePx: CHAPTER_HEADER_RESERVE_PX,
      reserveFootnotesBand: useStudyPageStack && showPageFootnotes,
      liveColumnSafetyPx: READER_LIVE_COLUMN_SAFETY_PX,
      spreadPane: useSpreadDoubleColumn && useBookSpread,
    });
    const articleStyle = {
      ...readerScriptureTypographyStyle(fontChoice, fontScale, readerFontLayout),
      fontFamily: scriptureFont,
      ["--reader-scripture-font-family" as string]: scriptureFont,
    };
    return (
      <div
        data-reader-page-side={side}
        className={cn(
          "relative flex flex-col h-full min-h-0 overflow-hidden bg-paper pt-10 pb-2",
          readerPageClass,
          inkMode && "reader-ink-active",
        )}
        style={pageHorizontalPadding(side, !effectiveSpread, compactChrome)}
      >
        <div
          className={cn(
            "flex-shrink-0 flex items-start justify-between gap-3",
            inkMode && "pointer-events-none",
          )}
        >
          <ReaderPageHeader
            side={side}
            scrollMode={scrollMode}
            compactChrome={compactChrome}
            effectiveSpread={effectiveSpread}
            globalPage={globalPage}
            pageBookName={pageBookName}
            readerSourceLine={readerSourceLine}
            onOpenSettings={openReaderSettings}
          />
        </div>
        {pageLoading || pageOutOfRange ? (
          <ReaderPageBodyPlaceholder
            pageLoading={pageLoading}
            showMeasureArticle={effectiveSpread && measuresRestPage}
            measureRestRef={onMeasureRestRef}
            scriptureTypoClass={scriptureTypoClass}
            articleStyle={articleStyle}
          />
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
            <article
              key={`${pageBookAbbr}-${pageChapter}-${pageIdx}-${side}`}
              ref={attachMeasureRef}
              data-reading-area
              aria-busy={!ready}
              className={cn(
                scrollMode ? "w-full" : "flex-1 min-h-0 w-full overflow-hidden",
                scriptureTypoClass,
                activeStudyLayout === "holman" && "reader-holman-study",
                showPageFootnotes && "reader-page-footnotes",
                inkMode ? "!select-none" : "selectable-text",
              )}
              style={articleStyle}
            >
              {showBookIntro ? (
                <BookIntroductionBlock title={bookIntro!.title} html={bookIntro!.html} />
              ) : null}
              {renderReaderPageScripture({
                scrollMode,
                useStreamReader,
                streamChapters,
                scrollDocumentBlocks,
                verses,
                slice,
                book: { abbr: book.abbr, name: book.name },
                chapter,
                paragraphStarts,
                headingByVerse,
                passagePoetryBlocks: passage?.poetryBlocks ?? [],
                streamSlice,
                pageContentReady,
                inlineChapterPlates,
                renderVerse,
                activeStudyLayout,
                pageStartsWithChapterHeader,
                useStudyPageStack,
                spreadColumnLayout,
                holmanVerseGroups,
                showPageFootnotes,
                holmanFootnoteVerses,
                showHolmanConnections,
                stackContentHeightPx,
                scriptureColumnHeightPx,
                holmanNavigateRef,
              })}
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
          <ReaderPageFooter
            inkMode={inkMode}
            pageBookName={pageBookName}
            globalPage={globalPage}
            currentBible={currentBible}
            onOpenSettings={openReaderSettings}
            onPrevPage={() => goPage(-1)}
            onNextPage={() => goPage(1)}
          />
        ) : null}
      </div>
    );
  };

  const activePageIdx = useBookSpread ? spreadPageIdx : chapterPage;
  const leftIdx = activePageIdx;
  const rightIdx = useSpreadDoubleColumn ? activePageIdx : activePageIdx + 1;

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

  const hubInline = hubReaderInline(showHubShell, hubFullscreen);

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
        onChapterContext={() => setChapterContextOpen(true)}
        showChapterContext={showChapterContext}
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
        hubCompactChrome={hubInline}
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
          readerSceneTopOffsetClass(compactChrome, hubInline),
          mobileChromeBottom,
        )}
      >
      <ReaderShell
        biblePane={
      <BookScene
        progress={progress}
        singlePage={!effectiveSpread}
        tabletPortrait={tabletPortrait}
        fillContainer
        fabricSurround={showHubShell}
        hubInline={hubInline}
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
              instant={effectiveSpread}
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
                instant
              >
                {renderPageSurface(rightIdx, "right")}
              </PageFlip>
            </SwipePage>
          ) : (
            renderPageSurface(rightIdx, "right")
          )
        }
      />
        }
      />
      </div>

      {!scrollMode && (
        <>
      <button
        onClick={() => goPage(-1)}
        aria-label="Previous page"
        className={cn(
          overlayPos,
          readerPageTurnTopOffsetClass(compactChrome, hubInline),
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
          readerPageTurnTopOffsetClass(compactChrome, hubInline),
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

      {!scrollMode && paginatorReady && useStreamReader && streamChapters.length > 0 && !!passage ? (
        <BookPaginator
          chapters={streamChapters}
          plateFocus={plateFocus}
          pageWidth={Math.max(180, pageBox.w)}
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
        spreadStudyActive={spreadStudyActive}
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
        chapterContextOpen={chapterContextOpen}
        setChapterContextOpen={setChapterContextOpen}
        chapterCtx={chapterCtx}
      />

      <SelectionPencilOverlay enabled={!inkMode} />

      <ReaderSelectionChrome
        tbSel={tbSel}
        inkMode={inkMode}
        spreadStudyActive={spreadStudyActive}
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
