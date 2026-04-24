import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BOOKS, findBookByAbbr } from "@/data/books";
import { fetchPassage, listBibles, type BibleEntry, type Passage, type PassageVerse } from "@/lib/bible/api";
import { splitJesusSpeech } from "@/lib/bible/redLetter";
import { BookTabs } from "@/components/bible/BookTabs";
import { Ribbons, type RibbonData } from "@/components/bible/Ribbons";
import { VerseSheet } from "@/components/bible/VerseSheet";
import { HighlightMenu } from "@/components/bible/HighlightMenu";
import { NoteDialog } from "@/components/bible/NoteDialog";
import { BookmarkDialog } from "@/components/bible/BookmarkDialog";
import { MarkerSvgFilter } from "@/components/bible/MarkerSvgFilter";
import { TopBar } from "@/components/bible/TopBar";
import { ChapterPicker } from "@/components/bible/ChapterPicker";
import { BookScene } from "@/components/bible/BookScene";
import { Paginator } from "@/components/bible/Paginator";
import { PageFlip } from "@/components/bible/PageFlip";
import { useChapterData, useBookmarks } from "@/hooks/useUserData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, NotebookPen } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const LS_BIBLE_KEY = "yb.bibleId";
const LS_FONT_SCALE_KEY = "yb.fontScale";
const PAGE_TYPO_CLASS = "font-scripture text-[14px] sm:text-[14.5px] leading-[1.5] ink-text";
const COLUMN_CLASS = "columns-2 gap-4 sm:gap-5 [column-rule:1px_solid_hsl(var(--paper-edge))]";

/**
 * Lets the user grab the OUTER corner of a page and drag it across the spine
 * to turn — like iBooks. The right page's outer (right) edge folds to the
 * left to advance; the left page's outer (left) edge folds to the right to
 * go back. A small swipe anywhere on the page also turns.
 */
function CornerDragPage({
  side,
  onTurn,
  children,
}: {
  side: "left" | "right";
  /** delta = +1 forward, -1 back */
  onTurn: (delta: 1 | -1) => void;
  children: React.ReactNode;
}) {
  const isRight = side === "right";
  // Drag distance in px (negative = leftward for right page; positive = rightward for left page)
  const x = useMotionValue(0);
  // Map drag distance to a rotateY (0° → ±180°). A page width is roughly 500px.
  const PAGE_W = 520;
  const rotateY = useTransform(x, (v) => {
    if (isRight) {
      // forward turn: x goes 0 → -PAGE_W → rotateY 0 → -180
      const t = Math.max(-1, Math.min(0, v / PAGE_W));
      return t * 180;
    } else {
      // back turn: x goes 0 → +PAGE_W → rotateY 0 → +180
      const t = Math.max(0, Math.min(1, v / PAGE_W));
      return t * 180;
    }
  });

  const commit = (delta: 1 | -1) => {
    // Snap to fully turned, then fire onTurn (which will navigate / change page;
    // the new page renders and x resets naturally on remount).
    const target = isRight ? -PAGE_W : PAGE_W;
    animate(x, target, {
      duration: 0.32,
      ease: [0.45, 0.05, 0.25, 1],
      onComplete: () => {
        onTurn(delta);
        x.set(0);
      },
    });
  };
  const cancel = () => {
    animate(x, 0, { type: "spring", stiffness: 280, damping: 28 });
  };

  return (
    <div
      className="relative h-full w-full"
      style={{ perspective: 2200, transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="h-full w-full touch-pan-y"
        drag="x"
        dragElastic={0}
        dragMomentum={false}
        dragConstraints={isRight ? { left: -PAGE_W, right: 0 } : { left: 0, right: PAGE_W }}
        style={{
          x,
          rotateY,
          transformOrigin: isRight ? "left center" : "right center",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          willChange: "transform",
        }}
        onDragEnd={(_, info) => {
          const COMMIT_DIST = PAGE_W * 0.28;
          const COMMIT_VEL = 380;
          if (isRight) {
            // Forward: drag left
            if (info.offset.x < -COMMIT_DIST || info.velocity.x < -COMMIT_VEL) commit(1);
            // Back: drag right (small swipe)
            else if (info.offset.x > COMMIT_DIST || info.velocity.x > COMMIT_VEL) {
              x.set(0);
              onTurn(-1);
            } else cancel();
          } else {
            if (info.offset.x > COMMIT_DIST || info.velocity.x > COMMIT_VEL) commit(-1);
            else if (info.offset.x < -COMMIT_DIST || info.velocity.x < -COMMIT_VEL) {
              x.set(0);
              onTurn(1);
            } else cancel();
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function ReaderPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ book?: string; chapter?: string }>();

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

  const [activeVerse, setActiveVerse] = useState<{ number: number; text: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hlMenu, setHlMenu] = useState<{ verse: number; x: number; y: number } | null>(null);
  const [noteOpen, setNoteOpen] = useState<{ verse: number } | null>(null);
  const [bmDialog, setBmDialog] = useState<{ position: 1 | 2 | 3 } | null>(null);
  const [pickerBook, setPickerBook] = useState<typeof book | null>(null);

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

  const isMobile = useIsMobile();

  // Total chapters across the canon → progress through the Bible
  const { progress, chaptersBefore, totalChapters } = useMemo(() => {
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

  const { highlights, notes, setHighlight, upsertNote, deleteNote } = useChapterData(book.abbr, chapter);
  const { bookmarks, setBookmark } = useBookmarks();

  const lpTimer = useRef<number | null>(null);
  const lpFired = useRef(false);

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
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageBox, setPageBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    if (!measureRef.current) return;
    const el = measureRef.current;
    const ro = new ResizeObserver(() => {
      setPageBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setPageBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [isMobile]);

  // ---- Pagination ----
  const [splits, setSplits] = useState<number[]>([0]);
  // Reset when chapter / size changes
  useEffect(() => { setSplits([0]); }, [book.abbr, chapter, pageBox.w, pageBox.h, isMobile, fontScale]);
  const verses = passage?.verses ?? [];
  const totalPagesInChapter = Math.max(1, splits.length - 1);

  // ---- Page cursor (which page within this chapter is showing) ----
  const [chapterPage, setChapterPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"forward" | "back">("forward");
  useEffect(() => { setChapterPage(0); }, [book.abbr, chapter, fontScale]);

  // Pending verse-jump: after the user picks a verse from the TopBar picker,
  // remember it so once the chapter (re)loads and pagination splits are known,
  // we can hop to the page that contains that verse.
  const [pendingVerse, setPendingVerse] = useState<number | null>(null);
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
    if (!isMobile && target % 2 === 1) target -= 1;
    setChapterPage(Math.max(0, target));
    setPendingVerse(null);
  }, [pendingVerse, splits, isMobile]);

  // Auth/onboarding gates — placed AFTER all hooks so hook order stays stable
  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!loading && user && profile && !profile.onboarded) return <Navigate to="/onboarding" replace />;

  // For desktop spreads we show TWO consecutive pages: chapterPage and chapterPage+1.
  // For mobile we show only one. So advance by 1 (mobile) or 2 (desktop).
  const pagesPerTurn = isMobile ? 1 : 2;

  const goPage = (delta: number) => {
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
  const onVersePointerDown = (e: React.PointerEvent, v: { number: number; text: string }) => {
    lpFired.current = false;
    if (lpTimer.current) window.clearTimeout(lpTimer.current);
    const x = e.clientX, y = e.clientY;
    lpTimer.current = window.setTimeout(() => {
      lpFired.current = true;
      setHlMenu({ verse: v.number, x, y });
    }, 420);
  };
  const onVersePointerUp = (v: { number: number; text: string }) => {
    if (lpTimer.current) window.clearTimeout(lpTimer.current);
    if (!lpFired.current) {
      setActiveVerse(v);
      setSheetOpen(true);
    }
  };
  const onVersePointerCancel = () => { if (lpTimer.current) window.clearTimeout(lpTimer.current); };

  const noteFor = (n: number) => notes.find(x => x.verse === n);
  const hlFor = (n: number) => highlights.find(x => x.verse === n);
  const reference = `${book.name} ${chapter}`;

  const goBook = (b: typeof book) => setPickerBook(b);

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
    const hl = hlFor(v.number);
    const note = noteFor(v.number);
    const segments = splitJesusSpeech(book.abbr, chapter, v.number, v.text);
    const body = segments.map((s, i) =>
      s.isJesus ? (
        <span key={i} className="red-letter">{s.text}</span>
      ) : (
        <span key={i}>{s.text}</span>
      ),
    );
    return (
      <span key={v.number}>
        <span
          onPointerDown={(e) => onVersePointerDown(e, v)}
          onPointerUp={() => onVersePointerUp(v)}
          onPointerCancel={onVersePointerCancel}
          className="no-tap-highlight cursor-pointer"
        >
          <span className="verse-num">{v.number}</span>
          {hl ? (
            <span
              className={`marker-hl v${markerVariant(book.abbr, chapter, v.number)}`}
              style={{ ["--hl-color" as string]: `var(${hl.color})` }}
            >
              {body}
            </span>
          ) : body}
          {note && (
            <button
              onClick={(e) => { e.stopPropagation(); setNoteOpen({ verse: v.number }); }}
              className="inline-flex items-center align-middle ml-1 w-4 h-4 rounded-full bg-gold/20 text-gold-deep hover:bg-gold/40 transition-colors"
              aria-label="Open note"
            >
              <NotebookPen className="w-2.5 h-2.5 m-auto" />
            </button>
          )}
        </span>{" "}
      </span>
    );
  };

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
    return (
      <div
        className={`relative h-full w-full overflow-hidden real-paper ${
          side === "left" ? "pl-8 sm:pl-14 pr-5 sm:pr-9" : "pl-5 sm:pl-9 pr-8 sm:pr-14"
        } pt-9 pb-10`}
      >
        {/* Running header */}
        <div className={`absolute top-2 ${side === "left" ? "left-8 sm:left-14" : "right-8 sm:right-14"} text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 font-display`}>
          {book.name}
        </div>
        {isFirst && ChapterHeader}
        {loadingPassage ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-leather/60" /></div>
        ) : (
          <article
            className={`${PAGE_TYPO_CLASS} ${COLUMN_CLASS}`}
            style={{ fontSize: `${fontScale}em` }}
          >
            <p className="text-justify hyphens-auto" style={{ orphans: 2, widows: 2 }}>
              {slice.map(renderVerse)}
            </p>
          </article>
        )}
        {/* Page number footer with subtle prev/next chevrons */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] text-muted-foreground/60 font-display tracking-widest">
          <button
            onClick={() => goPage(-1)}
            aria-label="Previous page"
            className="p-0.5 rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>{book.name} · p. {globalPage}</span>
          <button
            onClick={() => goPage(1)}
            aria-label="Next page"
            className="p-0.5 rounded-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Determine left & right page indices
  const leftIdx = isMobile ? chapterPage : chapterPage;
  const rightIdx = isMobile ? chapterPage : chapterPage + 1;
  // Mobile alternates the visible side based on parity (odd = right page, even = left page)
  const mobileSide: "left" | "right" = chapterPage % 2 === 0 ? "left" : "right";

  return (
    <div className={`min-h-screen relative transition-all duration-700 ${focusMode ? "saturate-[0.85] contrast-[0.95]" : ""}`}>
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
      />

      {/* Hidden measurement node — same width/height as a real page */}
      <div
        ref={measureRef}
        aria-hidden
        className="fixed pointer-events-none opacity-0"
        style={{
          top: 80,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <BookScene
        progress={progress}
        pageSide={mobileSide}
        ribbons={
          <Ribbons
            ribbons={bookmarks as RibbonData[]}
            swaying={false}
            onJump={(r) => navigate(`/read/${r.book}/${r.chapter}`)}
            onAddAt={(p) => setBmDialog({ position: p })}
          />
        }
        renderTabs={!focusMode ? (s) => <BookTabs current={book} onSelect={goBook} side={s} /> : undefined}
        leftPage={
          <CornerDragPage side="left" onTurn={goPage}>
            <PageFlip pageKey={`L-${book.abbr}-${chapter}-${leftIdx}`} direction={flipDirection} side="left">
              <PageSurface pageIdx={leftIdx} side="left" />
            </PageFlip>
          </CornerDragPage>
        }
        rightPage={
          <CornerDragPage side="right" onTurn={goPage}>
            <PageFlip pageKey={`R-${book.abbr}-${chapter}-${rightIdx}`} direction={flipDirection} side="right">
              <PageSurface pageIdx={rightIdx} side="right" />
            </PageFlip>
          </CornerDragPage>
        }
      />

      {/* Click hot-zones for page turns — narrow strips at the very edges so
          they never sit on top of the thumb-index tabs (which live ~16-40px
          in from each edge). z-index sits BELOW the tabs (z-[7] inside BookScene). */}
      <button
        onClick={() => goPage(-1)}
        aria-label="Previous page"
        className="fixed top-20 bottom-16 left-0 w-3 z-[5] opacity-0"
      />
      <button
        onClick={() => goPage(1)}
        aria-label="Next page"
        className="fixed top-20 bottom-16 right-0 w-3 z-[5] opacity-0"
      />

      {/* Headless paginator — measures and reports splits */}
      {pageBox.w > 0 && pageBox.h > 0 && verses.length > 0 && (
        <Paginator
          verses={verses}
          bookAbbr={book.abbr}
          chapter={chapter}
          pageWidth={Math.max(200, pageBox.w * (isMobile ? 0.85 : 0.42))}
          pageHeight={Math.max(200, pageBox.h - 120)}
          className={PAGE_TYPO_CLASS}
          columnsClassName={COLUMN_CLASS}
          header={ChapterHeader}
          footerHeight={40}
          fontSizeStyle={{ fontSize: `${fontScale}em` }}
          onSplitsChange={setSplits}
        />
      )}

      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-30 bg-leather/90 text-paper text-xs px-4 py-2 rounded-full backdrop-blur"
          >
            Secret Place — quieted. Tap eye to leave.
          </motion.div>
        )}
      </AnimatePresence>

      {activeVerse && (
        <VerseSheet
          open={sheetOpen} onOpenChange={setSheetOpen}
          reference={`${book.name} ${chapter}:${activeVerse.number}`}
          verseText={activeVerse.text}
        />
      )}

      <HighlightMenu
        open={!!hlMenu}
        paletteId={profile?.highlight_palette ?? "classic"}
        currentColor={hlMenu ? hlFor(hlMenu.verse)?.color ?? null : null}
        x={hlMenu?.x ?? 0} y={hlMenu?.y ?? 0}
        onPick={(c) => { if (hlMenu) setHighlight(hlMenu.verse, c); setHlMenu(null); }}
        onClear={() => { if (hlMenu) setHighlight(hlMenu.verse, null); setHlMenu(null); }}
        onNote={() => { if (hlMenu) { setNoteOpen({ verse: hlMenu.verse }); setHlMenu(null); } }}
        onClose={() => setHlMenu(null)}
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

      {pickerBook && (
        <ChapterPicker
          open
          book={pickerBook}
          currentChapter={pickerBook.abbr === book.abbr ? chapter : undefined}
          onClose={() => setPickerBook(null)}
          onPick={(c) => {
            navigate(`/read/${pickerBook.abbr}/${c}`);
            setPickerBook(null);
          }}
        />
      )}
    </div>
  );
}
