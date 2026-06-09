import { Link } from "react-router-dom";
import {
  BookmarkPlus,
  ChevronLeft,
  Eye,
  EyeOff,
  Languages,
  Minus,
  Moon,
  Network,
  PenLine,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { BookPickerStep } from "@/components/bible/BookPickerStep";
import { ReaderFontPicker } from "@/components/bible/ReaderFontPicker";
import type { FontChoiceId } from "@/lib/bible/fontChoices";
import { readerChromeText, readerChromeTextMuted, readerFontScaleGroup, readerGlassBar, readerPickerGridButton, readerPickerGridButtonSelected, readerPickerHeader, readerPickerIconButton, readerPickerInput, readerPickerMenuButton, readerPickerPrimaryButton, readerPickerSecondaryButton, readerPickerSectionLabel } from "@/lib/bible/readerChromeClasses";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { BibleEntry } from "@/lib/bible/api";
import { BOOKS, BibleBook } from "@/data/books";
import { useEffect, useState } from "react";

type PickerStep = "book" | "chapter" | "verse";
export type ReaderMenuPanel = "nav" | "settings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When the sheet opens, start on this panel (e.g. footer book name → settings). */
  initialPanel?: ReaderMenuPanel;
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
  fontChoice?: string;
  onFontChoiceChange?: (choice: FontChoiceId) => void;
  onBookmark: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  inkMode?: boolean;
  onToggleInkMode?: () => void;
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
  fontChoice,
  onFontChoiceChange,
  onBookmark,
  focusMode,
  onToggleFocus,
  inkMode = false,
  onToggleInkMode,
  initialPanel = "nav",
}: Props) {
  const [panel, setPanel] = useState<ReaderMenuPanel>("nav");
  const [step, setStep] = useState<PickerStep>("book");
  const [pickedBook, setPickedBook] = useState<BibleBook>(currentBook ?? BOOKS[0]);
  const [pickedChapter, setPickedChapter] = useState(currentChapter ?? 1);
  const [verseInput, setVerseInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setPanel(initialPanel);
    setStep("book");
    setPickedBook(currentBook);
    setPickedChapter(currentChapter);
    setVerseInput("");
  }, [open, initialPanel, currentBook, currentChapter]);

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
  const currentBible = bibles.find((b) => b.id === bibleId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className={`max-h-[min(88dvh,920px)] p-0 flex flex-col rounded-b-2xl border-0 [&>button]:hidden ${readerGlassBar}`}
      >
        <div className="px-5 pt-3 pb-2 border-b border-white/40 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {panel === "settings" ? (
                <button
                  type="button"
                  onClick={() => setPanel("nav")}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-zinc-800 mb-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Reader</p>
              )}
              <h2 className={`font-system text-xl font-semibold tracking-tight truncate ${readerChromeText}`}>
                {panel === "settings" ? "Settings" : reference}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className={cn(readerPickerIconButton, "p-2 -mr-1 shrink-0")}
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {panel === "settings" ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
            <section>
              <p className={cn(readerPickerSectionLabel, "mb-2")}>Translation</p>
              <label className="flex items-center gap-2 rounded-xl border border-white/50 bg-white/40 px-2 py-1.5">
                <Languages className="w-4 h-4 shrink-0 text-zinc-500" aria-hidden />
                <select
                  value={bibleId}
                  onChange={(e) => onChangeBible(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-system text-zinc-800 focus:outline-none"
                  aria-label="Bible translation"
                >
                  {bibles.length === 0 && <option value="">Loading…</option>}
                  {bibles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.abbreviation} — {b.name}
                    </option>
                  ))}
                </select>
              </label>
              {currentBible ? (
                <p className="mt-1.5 text-[11px] text-zinc-500 truncate">{currentBible.name}</p>
              ) : null}
            </section>

            {onFontChoiceChange ? (
              <section>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-2">Scripture font</p>
                <ReaderFontPicker value={fontChoice} onChange={onFontChoiceChange} layout="grid" />
              </section>
            ) : null}

            <section>
              <p className={cn(readerPickerSectionLabel, "mb-2")}>Text size</p>
              <div className={cn(readerFontScaleGroup, "justify-center px-2 py-1.5")}>
                <button
                  type="button"
                  onClick={() => onFontScaleChange(Math.max(0.85, +(fontScale - 0.1).toFixed(2)))}
                  aria-label="Smaller text"
                  disabled={fontScale <= 0.85 + 0.001}
                  className={cn("p-2 rounded-full", readerChromeTextMuted, "hover:text-zinc-800 hover:bg-white/50 transition-colors disabled:opacity-40")}
                >
                  <Minus className="w-4 h-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => onFontScaleChange(1)}
                  className={cn("px-3 text-sm font-mono tabular-nums min-w-[3.5rem]", readerChromeTextMuted, "hover:text-zinc-800 transition-colors")}
                >
                  {Math.round(fontScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => onFontScaleChange(Math.min(1.5, +(fontScale + 0.1).toFixed(2)))}
                  aria-label="Larger text"
                  disabled={fontScale >= 1.5 - 0.001}
                  className={cn("p-2 rounded-full", readerChromeTextMuted, "hover:text-zinc-800 hover:bg-white/50 transition-colors disabled:opacity-40")}
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </section>

            <Button asChild variant="outline" className={cn("w-full", readerPickerMenuButton)}>
              <Link to="/settings" onClick={close}>
                <Settings className="w-4 h-4" />
                All app settings
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className={cn(readerPickerHeader, "shrink-0")}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {step !== "book" && (
                    <button
                      type="button"
                      onClick={() => setStep(step === "verse" && pickedBook.chapters > 1 ? "chapter" : "book")}
                      aria-label="Back"
                      className={cn(readerPickerIconButton, "-ml-1")}
                    >
                      <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                  <p className={cn(readerPickerSectionLabel, "truncate")}>
                    {step === "book" && "Go to · book"}
                    {step === "chapter" && (
                      <>
                        <span className="text-zinc-800 normal-case tracking-normal text-sm font-semibold">{pickedBook.name}</span>
                        {" · chapter"}
                      </>
                    )}
                    {step === "verse" && (
                      <>
                        <span className="text-zinc-800 normal-case tracking-normal text-sm font-semibold">
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
                    <BookPickerStep currentBook={currentBook} onPickBook={pickBook} gridCols="two" />
                  </div>
                )}

                {step === "chapter" && (
                  <div className="p-4">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
                      {Array.from({ length: pickedBook.chapters }, (_, i) => i + 1).map((c) => {
                        const isCurrent = pickedBook.abbr === currentBook.abbr && c === currentChapter;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => pickChapter(c)}
                            className={cn(
                              "h-11 text-sm",
                              readerPickerGridButton,
                              isCurrent && readerPickerGridButtonSelected,
                            )}
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
                        className={readerPickerSecondaryButton}
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
                          className={cn("w-14 py-2", readerPickerInput)}
                        />
                        <button
                          type="submit"
                          className={readerPickerPrimaryButton}
                        >
                          Go
                        </button>
                      </form>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-2">
                      {Array.from({ length: verseGridSize }, (_, i) => i + 1).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => jump(v)}
                          className={cn("h-10 text-xs", readerPickerGridButton)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    {!sameAsLoaded && (
                      <p className="text-[11px] text-zinc-500 font-system text-center mt-3 italic">
                        Verse count unknown until the chapter loads.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-white/40 px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={readerPickerMenuButton}
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
                  className={readerPickerMenuButton}
                  onClick={() => {
                    onToggleInkMode?.();
                    close();
                  }}
                  disabled={!onToggleInkMode}
                >
                  <PenLine className="w-4 h-4" />
                  {inkMode ? "Exit ink mode" : "Write on page"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={readerPickerMenuButton}
                  onClick={() => {
                    onToggleFocus();
                    close();
                  }}
                >
                  {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {focusMode ? "Exit focus" : "Secret Place"}
                </Button>
                <Button asChild variant="outline" className={readerPickerMenuButton}>
                  <Link to="/sleep" onClick={close}>
                    <Moon className="w-4 h-4" />
                    Sleep mode
                  </Link>
                </Button>
                <Button asChild variant="outline" className={readerPickerMenuButton}>
                  <Link to="/framework" onClick={close}>
                    <Network className="w-4 h-4" />
                    Framework
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("col-span-2", readerPickerMenuButton)}
                  onClick={() => setPanel("settings")}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                  {currentBible ? (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">{currentBible.abbreviation}</span>
                  ) : null}
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="w-10 h-1 rounded-full bg-zinc-300/60 mx-auto mb-2 shrink-0" aria-hidden />
      </SheetContent>
    </Sheet>
  );
}
