import { Link } from "react-router-dom";
import { Eye, EyeOff, Moon, Settings, BookmarkPlus, ChevronDown, ChevronUp, ChevronLeft, Search, X, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BibleEntry } from "@/lib/bible/api";
import { BOOKS, BibleBook, SECTION_LABELS } from "@/data/books";
import { useMemo, useState } from "react";

interface Props {
  reference: string;
  collapsed: boolean;
  focusMode: boolean;
  onToggleFocus: () => void;
  bibleId: string;
  bibles: BibleEntry[];
  onChangeBible: (id: string) => void;
  onBookmark: () => void;
  /** Currently displayed book (for picker default) */
  currentBook: BibleBook;
  /** Currently displayed chapter (for picker default) */
  currentChapter: number;
  /** Number of verses in the currently loaded chapter (for verse grid) */
  currentVerseCount: number;
  /** Jump to a specific reference. verse is optional (defaults to top of chapter). */
  onJumpTo: (book: BibleBook, chapter: number, verse?: number) => void;
  /** Current text-size scale (1 = default). */
  fontScale: number;
  /** Bump the text-size scale by ±step (clamped). Pass 0 to reset. */
  onFontScaleChange: (next: number) => void;
}

type PickerStep = "book" | "chapter" | "verse";

export function TopBar({
  reference, collapsed, focusMode, onToggleFocus,
  bibleId, bibles, onChangeBible, onBookmark,
  currentBook, currentChapter, currentVerseCount, onJumpTo,
  fontScale, onFontScaleChange,
}: Props) {
  const current = bibles.find(b => b.id === bibleId);
  const [open, setOpen] = useState(false);

  // Reference picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("book");
  const [pickedBook, setPickedBook] = useState<BibleBook>(currentBook ?? BOOKS[0]);
  const [pickedChapter, setPickedChapter] = useState<number>(currentChapter ?? 1);
  const [search, setSearch] = useState("");

  const onOpenPicker = (next: boolean) => {
    setPickerOpen(next);
    if (next) {
      // Reset to "book" each time it opens, seeded with the current book/chapter
      setStep("book");
      setPickedBook(currentBook);
      setPickedChapter(currentChapter);
      setSearch("");
    }
  };

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BOOKS;
    return BOOKS.filter(b => b.name.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q));
  }, [search]);

  // Group books by testament for the book step
  const otBooks = filteredBooks.filter(b => b.testament === "OT");
  const ntBooks = filteredBooks.filter(b => b.testament === "NT");

  const pickBook = (b: BibleBook) => {
    setPickedBook(b);
    if (b.chapters === 1) {
      // 1-chapter books skip straight to verse step
      setPickedChapter(1);
      setStep("verse");
    } else {
      setStep("chapter");
    }
  };
  const pickChapter = (c: number) => {
    setPickedChapter(c);
    setStep("verse");
  };
  const jump = (verse?: number) => {
    onJumpTo(pickedBook, pickedChapter, verse);
    setPickerOpen(false);
  };

  // Verse grid uses the current chapter's known verse count when the user is
  // jumping within the same book+chapter; otherwise we don't know the count
  // ahead of time, so show a generous default and let the user type.
  const sameAsLoaded = !!currentBook && pickedBook?.abbr === currentBook.abbr && pickedChapter === currentChapter;
  const verseGridSize = sameAsLoaded && currentVerseCount > 0 ? currentVerseCount : 176; // Ps 119 max
  const [verseInput, setVerseInput] = useState("");

  return (
    <>
      {/* Tiny pull-down handle, always visible at top edge */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show header"
          className="fixed top-0 left-1/2 -translate-x-1/2 z-30 mt-1 px-4 py-1 rounded-full bg-paper/60 backdrop-blur-sm text-leather/60 hover:text-leather hover:bg-paper/80 transition-all"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      <header
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-500 py-3 bg-paper/80 backdrop-blur-md border-b border-paper-edge ${
          open ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Reference picker — book / chapter / verse */}
          <Popover open={pickerOpen} onOpenChange={onOpenPicker}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-leather hover:text-leather-deep transition-colors">
                <span className="font-display text-lg transition-all">{reference}</span>
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={10}
              className="w-[min(94vw,560px)] p-0 paper-texture border-gold/30 shadow-leather"
            >
              {/* Header / breadcrumb */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-paper-edge bg-gradient-to-b from-paper-warm to-paper">
                <div className="flex items-center gap-1.5 min-w-0">
                  {step !== "book" && (
                    <button
                      onClick={() => setStep(step === "verse" && pickedBook.chapters > 1 ? "chapter" : "book")}
                      aria-label="Back"
                      className="p-1 -ml-1 text-muted-foreground hover:text-leather transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {step === "book" && "Choose book"}
                    {step === "chapter" && (
                      <span><span className="text-leather/80 normal-case tracking-normal text-sm font-display">{pickedBook.name}</span> · choose chapter</span>
                    )}
                    {step === "verse" && (
                      <span>
                        <span className="text-leather/80 normal-case tracking-normal text-sm font-display">
                          {pickedBook.name} {pickedChapter}
                        </span> · choose verse
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPickerOpen(false)}
                  aria-label="Close"
                  className="text-muted-foreground hover:text-leather transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              {step === "book" && (
                <div className="p-3">
                  <div className="relative mb-3">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search books…"
                      className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border border-paper-edge bg-paper/60 text-leather placeholder:text-muted-foreground/70 focus:outline-none focus:border-gold/50"
                    />
                  </div>
                  <div className="max-h-[55vh] overflow-y-auto space-y-3">
                    {otBooks.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5 px-1">Old Testament</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {otBooks.map(b => (
                            <button
                              key={b.abbr}
                              onClick={() => pickBook(b)}
                              className={`text-left px-2 py-1.5 rounded-md font-display text-sm border transition-all ${
                                b.abbr === currentBook.abbr
                                  ? "bg-leather text-paper border-leather-deep"
                                  : "bg-paper/60 border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40"
                              }`}
                            >
                              {b.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {ntBooks.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5 px-1">New Testament</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {ntBooks.map(b => (
                            <button
                              key={b.abbr}
                              onClick={() => pickBook(b)}
                              className={`text-left px-2 py-1.5 rounded-md font-display text-sm border transition-all ${
                                b.abbr === currentBook.abbr
                                  ? "bg-leather text-paper border-leather-deep"
                                  : "bg-paper/60 border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40"
                              }`}
                            >
                              {b.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {filteredBooks.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-8">No books match “{search}”.</div>
                    )}
                  </div>
                </div>
              )}

              {step === "chapter" && (
                <div className="p-3">
                  <div className="max-h-[55vh] overflow-y-auto">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
                      {Array.from({ length: pickedBook.chapters }, (_, i) => i + 1).map(c => {
                        const isCurrent = pickedBook.abbr === currentBook.abbr && c === currentChapter;
                        return (
                          <button
                            key={c}
                            onClick={() => pickChapter(c)}
                            className={`h-9 rounded-md font-display text-sm border transition-all ${
                              isCurrent
                                ? "bg-leather text-paper border-leather-deep"
                                : "bg-paper/60 border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === "verse" && (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => jump()}
                      className="px-3 py-1.5 rounded-md text-sm font-display bg-paper/60 border border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40 transition-all"
                    >
                      Top of chapter
                    </button>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const n = parseInt(verseInput, 10);
                        if (Number.isFinite(n) && n > 0) jump(n);
                      }}
                      className="flex items-center gap-1.5 ml-auto"
                    >
                      <input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={verseInput}
                        onChange={(e) => setVerseInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="v."
                        className="w-14 px-2 py-1.5 text-sm rounded-md border border-paper-edge bg-paper/60 text-leather placeholder:text-muted-foreground/70 focus:outline-none focus:border-gold/50"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 rounded-md text-sm font-display bg-leather text-paper hover:bg-leather-deep transition-colors"
                      >
                        Go
                      </button>
                    </form>
                  </div>
                  <div className="max-h-[45vh] overflow-y-auto">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5">
                      {Array.from({ length: verseGridSize }, (_, i) => i + 1).map(v => (
                        <button
                          key={v}
                          onClick={() => jump(v)}
                          className="h-8 rounded-md font-display text-xs border bg-paper/60 border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40 transition-all"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    {!sameAsLoaded && (
                      <div className="text-[11px] text-muted-foreground text-center mt-3 italic">
                        Verse count unknown until the chapter loads — pick a number above or use the box.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Translation chip */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border border-paper-edge bg-paper/60 text-muted-foreground hover:text-leather hover:border-gold/40 transition-colors"
                title="Switch translation"
              >
                {current?.abbreviation ?? "—"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
              {bibles.length === 0 && <DropdownMenuItem disabled>Loading translations…</DropdownMenuItem>}
              {bibles.map(b => (
                <DropdownMenuItem key={b.id} onClick={() => onChangeBible(b.id)} className={bibleId === b.id ? "font-semibold" : ""}>
                  <span className="font-mono text-xs text-muted-foreground mr-2">{b.abbreviation}</span>{b.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          {!focusMode && (
            <>
              {/* Text size — A−  ⏤  A+  with current % readout (click to reset) */}
              <div className="flex items-center gap-0.5 mr-1 px-1 py-0.5 rounded-md border border-paper-edge bg-paper/40">
                <button
                  type="button"
                  onClick={() => onFontScaleChange(Math.max(0.85, +(fontScale - 0.1).toFixed(2)))}
                  aria-label="Smaller text"
                  title="Smaller text"
                  className="p-1 rounded text-leather/70 hover:text-leather hover:bg-paper transition-colors disabled:opacity-40"
                  disabled={fontScale <= 0.85 + 0.001}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onFontScaleChange(1)}
                  aria-label={`Reset text size (current: ${Math.round(fontScale * 100)}%)`}
                  title="Reset text size"
                  className="px-1 text-[10px] font-mono tabular-nums text-leather/70 hover:text-leather transition-colors min-w-[2.6rem] text-center"
                >
                  {Math.round(fontScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => onFontScaleChange(Math.min(1.5, +(fontScale + 0.1).toFixed(2)))}
                  aria-label="Larger text"
                  title="Larger text"
                  className="p-1 rounded text-leather/70 hover:text-leather hover:bg-paper transition-colors disabled:opacity-40"
                  disabled={fontScale >= 1.5 - 0.001}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <Button variant="ghost" size="icon" onClick={onBookmark} title="Bookmark this page" className="text-leather/80 hover:text-leather">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
              <Link to="/sleep">
                <Button variant="ghost" size="icon" title="Sleep mode" className="text-leather/80 hover:text-leather">
                  <Moon className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="icon" title="Settings" className="text-leather/80 hover:text-leather">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={onToggleFocus} title={focusMode ? "Exit focus mode" : "Enter Secret Place (focus)"} className="text-leather/80 hover:text-leather">
            {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} title="Hide header" className="text-leather/80 hover:text-leather">
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
        </div>
      </header>
    </>
  );
}
