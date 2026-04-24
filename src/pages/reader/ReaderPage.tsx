import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BOOKS, findBookByAbbr } from "@/data/books";
import { fetchPassage, listBibles, type BibleEntry, type Passage } from "@/lib/bible/api";
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
import { useChapterData, useBookmarks } from "@/hooks/useUserData";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, NotebookPen } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const LS_BIBLE_KEY = "yb.bibleId";

export default function ReaderPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ book?: string; chapter?: string }>();

  // Resolve current book + chapter (default John 1)
  const book = useMemo(() => findBookByAbbr(params.book ?? "Jhn") ?? BOOKS.find(b => b.abbr === "Jhn")!, [params.book]);
  const chapter = Math.max(1, Math.min(book.chapters, parseInt(params.chapter ?? "1", 10) || 1));

  const [bibles, setBibles] = useState<BibleEntry[]>([]);
  const [bibleId, setBibleId] = useState<string>(() => localStorage.getItem(LS_BIBLE_KEY) ?? "");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loadingPassage, setLoadingPassage] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef<number | null>(null);

  // Verse interactions
  const [activeVerse, setActiveVerse] = useState<{ number: number; text: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hlMenu, setHlMenu] = useState<{ verse: number; x: number; y: number } | null>(null);
  const [noteOpen, setNoteOpen] = useState<{ verse: number } | null>(null);
  const [bmDialog, setBmDialog] = useState<{ position: 1 | 2 | 3 } | null>(null);
  const [pickerBook, setPickerBook] = useState<typeof book | null>(null);

  const { highlights, notes, setHighlight, upsertNote, deleteNote } = useChapterData(book.abbr, chapter);
  const { bookmarks, setBookmark } = useBookmarks();

  // Long-press detection
  const lpTimer = useRef<number | null>(null);
  const lpFired = useRef(false);

  // ---- Load translations once ----
  useEffect(() => {
    listBibles().then(list => {
      setBibles(list);
      if (!bibleId && list.length) {
        // prefer KJV / WEB / ESV / NIV when available
        const pref = ["KJV", "WEB", "ESV", "NIV", "NLT"];
        const found = list.find(b => pref.includes(b.abbreviation.toUpperCase())) ?? list[0];
        setBibleId(found.id);
        localStorage.setItem(LS_BIBLE_KEY, found.id);
      }
    }).catch(err => {
      console.error(err);
      toast({ variant: "destructive", title: "Couldn't load translations", description: "Check your API.Bible key in project secrets." });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Load passage when book/chapter/bible changes ----
  useEffect(() => {
    if (!bibleId) return;
    let cancelled = false;
    setLoadingPassage(true);
    setPassage(null);
    fetchPassage(bibleId, book.abbr, chapter)
      .then(p => { if (!cancelled) setPassage(p); })
      .catch(err => { console.error(err); toast({ variant: "destructive", title: "Couldn't load passage", description: String(err.message ?? err) }); })
      .finally(() => { if (!cancelled) setLoadingPassage(false); });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => { cancelled = true; };
  }, [bibleId, book.abbr, chapter]);

  // ---- Scroll-driven top-bar collapse + ribbon sway ----
  useEffect(() => {
    const onScroll = () => {
      setCollapsed(window.scrollY > 40);
      setScrolling(true);
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(() => setScrolling(false), 800);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!loading && user && profile && !profile.onboarded) return <Navigate to="/onboarding" replace />;

  const goBook = (b: typeof book) => setPickerBook(b);
  const goChapter = (delta: number) => {
    const next = chapter + delta;
    if (next < 1) {
      const prevIdx = BOOKS.findIndex(b => b.abbr === book.abbr) - 1;
      if (prevIdx >= 0) navigate(`/read/${BOOKS[prevIdx].abbr}/${BOOKS[prevIdx].chapters}`);
    } else if (next > book.chapters) {
      const nextIdx = BOOKS.findIndex(b => b.abbr === book.abbr) + 1;
      if (nextIdx < BOOKS.length) navigate(`/read/${BOOKS[nextIdx].abbr}/1`);
    } else {
      navigate(`/read/${book.abbr}/${next}`);
    }
  };

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

  const reference = `${book.name} ${chapter}`;
  const noteFor = (n: number) => notes.find(x => x.verse === n);
  const hlFor = (n: number) => highlights.find(x => x.verse === n);

  return (
    <div className={`min-h-screen relative paper-texture transition-all duration-700 ${focusMode ? "saturate-[0.85] contrast-[0.95]" : ""}`}>
      <MarkerSvgFilter />

      <TopBar
        reference={reference}
        collapsed={collapsed}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode(f => !f)}
        bibleId={bibleId}
        bibles={bibles}
        onChangeBible={(id) => { setBibleId(id); localStorage.setItem(LS_BIBLE_KEY, id); }}
        onBookmark={() => {
          // Find first empty slot
          const used = new Set(bookmarks.map(b => b.position));
          const free = ([1, 2, 3] as const).find(p => !used.has(p)) ?? 1;
          setBmDialog({ position: free });
        }}
      />

      {/* Ribbons */}
      <Ribbons
        ribbons={bookmarks as RibbonData[]}
        swaying={scrolling}
        onJump={(r) => navigate(`/read/${r.book}/${r.chapter}`)}
        onAddAt={(p) => setBmDialog({ position: p })}
      />

      {/* Side tabs */}
      {!focusMode && <BookTabs current={book} onSelect={goBook} />}

      {/* Reading area */}
      <main className="pt-20 pb-32 px-5 sm:px-6 max-w-3xl mx-auto relative page-vignette">
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-3xl sm:text-4xl text-leather text-center mb-1 mt-4"
        >
          {book.name}
        </motion.h1>
        <div className="text-center mb-8 flex items-center justify-center gap-4 text-muted-foreground">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/40" />
          <span className="font-display text-sm uppercase tracking-[0.3em]">Chapter {chapter}</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/40" />
        </div>

        {loadingPassage && (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-leather/60" /></div>
        )}

        {!loadingPassage && passage && (
          <article className="font-scripture text-[19px] sm:text-[20px] leading-[1.85] text-foreground/90">
            <p className="text-balance">
              {passage.verses.map(v => {
                const hl = hlFor(v.number);
                const note = noteFor(v.number);
                return (
                  <span key={v.number}>
                    <span
                      onPointerDown={(e) => onVersePointerDown(e, v)}
                      onPointerUp={() => onVersePointerUp(v)}
                      onPointerCancel={onVersePointerCancel}
                      className="no-tap-highlight cursor-pointer transition-colors hover:text-leather"
                    >
                      <span className="verse-num">{v.number}</span>
                      {hl ? (
                        <span className="marker-hl" style={{ ["--hl-color" as string]: `var(${hl.color})` }}>{v.text}</span>
                      ) : v.text}
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
              })}
            </p>
          </article>
        )}

        {/* Chapter nav */}
        <div className="flex items-center justify-between mt-16 mb-8">
          <Button variant="ghost" onClick={() => goChapter(-1)} className="text-leather hover:text-leather-deep">
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <div className="text-xs text-muted-foreground">{chapter} of {book.chapters}</div>
          <Button variant="ghost" onClick={() => goChapter(1)} className="text-leather hover:text-leather-deep">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </main>

      {/* Focus mode notice */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-leather/90 text-paper text-xs px-4 py-2 rounded-full backdrop-blur"
          >
            Secret Place — quieted. Tap eye to leave.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verse AI sheet */}
      {activeVerse && (
        <VerseSheet
          open={sheetOpen} onOpenChange={setSheetOpen}
          reference={`${book.name} ${chapter}:${activeVerse.number}`}
          verseText={activeVerse.text}
        />
      )}

      {/* Highlight bubble */}
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

      {/* Note dialog */}
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

      {/* Bookmark dialog */}
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

      {/* Chapter picker */}
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
