import { Link } from "react-router-dom";
import {
  BookmarkPlus,
  ChevronLeft,
  Eye,
  EyeOff,
  Minus,
  Moon,
  Network,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { BibleEntry } from "@/lib/bible/api";
import { BOOKS, BibleBook } from "@/data/books";
import { useEffect, useMemo, useState } from "react";

type PickerStep = "book" | "chapter" | "verse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: string;
  currentBook: BibleBook;
  currentChapter: number;
  currentVerseCount: number;
  onJumpTo: (book: BibleBook, chapter: number, verse?: number) => void;
  bibleId: string;
  bibles: BibleEntry[];
  onChangeBible: (id: string) => void;
  fontScale: number;
  onFontScaleChange: (next: number) => void;
  onBookmark: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}

export function ReaderMobileMenu({
  open,
  onOpenChange,
  reference,
  currentBook,
  currentChapter,
  currentVerseCount,
  onJumpTo,
  bibleId,
  bibles,
  onChangeBible,
  fontScale,
  onFontScaleChange,
  onBookmark,
  focusMode,
  onToggleFocus,
}: Props) {
  const [step, setStep] = useState<PickerStep>("book");
  const [pickedBook, setPickedBook] = useState<BibleBook>(currentBook ?? BOOKS[0]);
  const [pickedChapter, setPickedChapter] = useState(currentChapter ?? 1);
  const [search, setSearch] = useState("");
  const [verseInput, setVerseInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("book");
    setPickedBook(currentBook);
    setPickedChapter(currentChapter);
    setSearch("");
    setVerseInput("");
  }, [open, currentBook, currentChapter]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return BOOKS;
    return BOOKS.filter(b => b.name.toLowerCase().includes(q) || b.abbr.toLowerCase().includes(q));
  }, [search]);

  const otBooks = filteredBooks.filter(b => b.testament === "OT");
  const ntBooks = filteredBooks.filter(b => b.testament === "NT");

  const pickBook = (b: BibleBook) => {
    setPickedBook(b);
    if (b.chapters === 1) {
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
    onOpenChange(false);
  };

  const sameAsLoaded =
    !!currentBook && pickedBook?.abbr === currentBook.abbr && pickedChapter === currentChapter;
  const verseGridSize = sameAsLoaded && currentVerseCount > 0 ? currentVerseCount : 176;

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[min(92dvh,920px)] p-0 flex flex-col paper-texture border-t-2 border-gold/40 rounded-t-2xl [&>button]:hidden"
      >
        <div className="w-10 h-1 rounded-full bg-gold/40 mx-auto mt-2 shrink-0" aria-hidden />

        <div className="px-5 pt-3 pb-2 border-b border-paper-edge shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Reader</p>
              <h2 className="font-display text-xl text-leather">{reference}</h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="p-2 -mr-1 rounded-full text-muted-foreground hover:text-leather hover:bg-paper-warm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-paper-edge bg-gradient-to-b from-paper-warm/80 to-transparent shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {step !== "book" && (
                <button
                  type="button"
                  onClick={() => setStep(step === "verse" && pickedBook.chapters > 1 ? "chapter" : "book")}
                  aria-label="Back"
                  className="p-1 -ml-1 text-muted-foreground hover:text-leather transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground truncate">
                {step === "book" && "Go to · book"}
                {step === "chapter" && (
                  <>
                    <span className="text-leather/80 normal-case tracking-normal text-sm font-display">{pickedBook.name}</span>
                    {" · chapter"}
                  </>
                )}
                {step === "verse" && (
                  <>
                    <span className="text-leather/80 normal-case tracking-normal text-sm font-display">
                      {pickedBook.name} {pickedChapter}
                    </span>
                    {" · verse"}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {step === "book" && (
              <div className="p-4">
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search books…"
                    className="w-full pl-8 pr-2 py-2 text-sm rounded-md border border-paper-edge bg-paper/60 text-leather placeholder:text-muted-foreground/70 focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div className="space-y-4">
                  {otBooks.length > 0 && (
                    <section>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Old Testament</p>
                      <div className="grid grid-cols-2 gap-2">
                        {otBooks.map(b => (
                          <button
                            key={b.abbr}
                            type="button"
                            onClick={() => pickBook(b)}
                            className={`text-left px-2.5 py-2 rounded-md font-display text-sm border transition-all ${
                              b.abbr === currentBook.abbr
                                ? "bg-leather text-paper border-leather-deep"
                                : "bg-paper/60 border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40"
                            }`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {ntBooks.length > 0 && (
                    <section>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">New Testament</p>
                      <div className="grid grid-cols-2 gap-2">
                        {ntBooks.map(b => (
                          <button
                            key={b.abbr}
                            type="button"
                            onClick={() => pickBook(b)}
                            className={`text-left px-2.5 py-2 rounded-md font-display text-sm border transition-all ${
                              b.abbr === currentBook.abbr
                                ? "bg-leather text-paper border-leather-deep"
                                : "bg-paper/60 border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40"
                            }`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {filteredBooks.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No books match "{search}".</p>
                  )}
                </div>
              </div>
            )}

            {step === "chapter" && (
              <div className="p-4">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
                  {Array.from({ length: pickedBook.chapters }, (_, i) => i + 1).map(c => {
                    const isCurrent = pickedBook.abbr === currentBook.abbr && c === currentChapter;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pickChapter(c)}
                        className={`h-11 rounded-md font-display text-sm border transition-all ${
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
            )}

            {step === "verse" && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => jump()}
                    className="px-3 py-2 rounded-md text-sm font-display bg-paper/60 border border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40 transition-all"
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
                      className="w-14 px-2 py-2 text-sm rounded-md border border-paper-edge bg-paper/60 text-leather placeholder:text-muted-foreground/70 focus:outline-none focus:border-gold/50"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-md text-sm font-display bg-leather text-paper hover:bg-leather-deep transition-colors"
                    >
                      Go
                    </button>
                  </form>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-2">
                  {Array.from({ length: verseGridSize }, (_, i) => i + 1).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => jump(v)}
                      className="h-10 rounded-md font-display text-xs border bg-paper/60 border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40 transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {!sameAsLoaded && (
                  <p className="text-[11px] text-muted-foreground text-center mt-3 italic">
                    Verse count unknown until the chapter loads.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-paper-edge bg-gradient-to-t from-paper-warm to-paper px-4 py-4 space-y-4">
          <section>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Translation</p>
            <div className="max-h-28 overflow-y-auto rounded-lg border border-paper-edge divide-y divide-paper-edge">
              {bibles.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Loading translations…</p>
              )}
              {bibles.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onChangeBible(b.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    bibleId === b.id ? "bg-leather/10 text-leather font-medium" : "hover:bg-gold/10 text-foreground"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">{b.abbreviation}</span>
                  {b.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Text size</p>
            <div className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-paper-edge bg-paper/40">
              <button
                type="button"
                onClick={() => onFontScaleChange(Math.max(0.85, +(fontScale - 0.1).toFixed(2)))}
                aria-label="Smaller text"
                disabled={fontScale <= 0.85 + 0.001}
                className="p-2 rounded text-leather/70 hover:text-leather hover:bg-paper transition-colors disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onFontScaleChange(1)}
                className="px-3 text-sm font-mono tabular-nums text-leather min-w-[3.5rem]"
              >
                {Math.round(fontScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => onFontScaleChange(Math.min(1.5, +(fontScale + 0.1).toFixed(2)))}
                aria-label="Larger text"
                disabled={fontScale >= 1.5 - 0.001}
                className="p-2 rounded text-leather/70 hover:text-leather hover:bg-paper transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 border-paper-edge bg-paper/60 text-leather hover:bg-gold/10"
              onClick={() => {
                onBookmark();
                close();
              }}
            >
              <BookmarkPlus className="w-4 h-4" />
              Bookmark
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 border-paper-edge bg-paper/60 text-leather hover:bg-gold/10"
              onClick={() => {
                onToggleFocus();
                close();
              }}
            >
              {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {focusMode ? "Exit focus" : "Secret Place"}
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 border-paper-edge bg-paper/60 text-leather hover:bg-gold/10">
              <Link to="/sleep" onClick={close}>
                <Moon className="w-4 h-4" />
                Sleep mode
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2 border-paper-edge bg-paper/60 text-leather hover:bg-gold/10">
              <Link to="/framework" onClick={close}>
                <Network className="w-4 h-4" />
                Framework
              </Link>
            </Button>
            <Button asChild variant="outline" className="col-span-2 justify-start gap-2 border-paper-edge bg-paper/60 text-leather hover:bg-gold/10">
              <Link to="/settings" onClick={close}>
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
