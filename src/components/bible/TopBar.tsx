import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Eye,
  EyeOff,
  Home,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { BookPickerStep } from "@/components/bible/BookPickerStep";
import { ReaderIconButton } from "@/components/bible/ReaderIconButton";
import { ReaderToolbarActions } from "@/components/bible/ReaderToolbarActions";
import type { FontChoiceId } from "@/lib/bible/fontChoices";
import {
  readerChromeText,
  readerChromeTextMuted,
  readerGlassBar,
  readerGlassHandle,
  readerGlassPanel,
  readerPickerGridButton,
  readerPickerGridButtonSelected,
  readerPickerHeader,
  readerPickerIconButton,
  readerPickerInput,
  readerPickerPrimaryButton,
  readerPickerSecondaryButton,
  readerPickerSectionLabel,
} from "@/lib/bible/readerChromeClasses";
import { readerOverlayPosition, readerChromeTopClass, readerHeaderSafePaddingClass } from "@/lib/bible/readerHubLayout";
import type { ReaderColumnLayout } from "@/lib/bible/readerColumnLayout";
import type { ReaderStudyLayoutPreference } from "@/lib/bible/readerStudyLayout";
import type { BibleEntry } from "@/lib/bible/api";
import type { BibleBook } from "@/data/books";
import { getBooks } from "@/lib/bible/canon";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";

interface Props {
  reference: string;
  collapsed: boolean;
  focusMode: boolean;
  onToggleFocus: () => void;
  bibleId: string;
  bibles: BibleEntry[];
  onChangeBible: (id: string) => void;
  onBookmark: () => void;
  books?: BibleBook[];
  currentBook: BibleBook;
  currentChapter: number;
  currentVerseCount: number;
  onJumpTo: (book: BibleBook, chapter: number, verse?: number) => void;
  fontScale: number;
  onFontScaleChange: (next: number) => void;
  fontChoice?: string;
  onFontChoiceChange?: (choice: FontChoiceId) => void;
  /** Viewport under READER_SINGLE_PAGE_MAX — compact header with scrollable toolbar */
  singlePage?: boolean;
  settingsOpenRequest?: number;
  inkMode?: boolean;
  onToggleInkMode?: () => void;
  onSearch?: () => void;
  onToggleAudio?: () => void;
  audioPlaying?: boolean;
  audioLoading?: boolean;
  audioDisabled?: boolean;
  online?: boolean;
  displayMode?: "scroll" | "pages";
  onToggleDisplayMode?: () => void;
  readerDark?: boolean;
  onToggleReaderDark?: () => void;
  columnLayout?: ReaderColumnLayout;
  onToggleColumnLayout?: () => void;
  studyLayoutPreference?: ReaderStudyLayoutPreference;
  onStudyLayoutPreferenceChange?: (next: ReaderStudyLayoutPreference) => void;
  audioPlaybackRate?: number;
  onCycleAudioSpeed?: () => void;
  containedInHub?: boolean;
  /** Hub shell reader — compact chrome whether embedded or fullscreen overlay. */
  hubCompactChrome?: boolean;
  hubFullscreen?: boolean;
  onToggleHubFullscreen?: () => void;
  returnTo?: string;
  returnLabel?: string;
  onReturn?: () => void;
  onChapterContext?: () => void;
  showChapterContext?: boolean;
}

type PickerStep = "book" | "chapter" | "verse";

export function TopBar({
  reference,
  focusMode,
  onToggleFocus,
  bibleId,
  bibles,
  onChangeBible,
  onBookmark,
  books: booksProp,
  currentBook,
  currentChapter,
  currentVerseCount,
  onJumpTo,
  fontScale,
  onFontScaleChange,
  fontChoice,
  onFontChoiceChange,
  singlePage = false,
  settingsOpenRequest = 0,
  inkMode = false,
  onToggleInkMode,
  onSearch,
  onToggleAudio,
  audioPlaying = false,
  audioLoading = false,
  audioDisabled = false,
  online = true,
  displayMode = "pages",
  onToggleDisplayMode,
  readerDark = false,
  onToggleReaderDark,
  columnLayout = "single",
  onToggleColumnLayout,
  studyLayoutPreference,
  onStudyLayoutPreferenceChange,
  audioPlaybackRate = 1,
  onCycleAudioSpeed,
  containedInHub = false,
  hubCompactChrome = false,
  hubFullscreen = false,
  onToggleHubFullscreen,
  returnTo,
  returnLabel = "Back",
  onReturn,
  onChapterContext,
  showChapterContext = false,
}: Props) {
  const overlayPos = readerOverlayPosition(containedInHub);
  const books = booksProp ?? getBooks();

  const homeControl = returnTo ? (
    <ReaderIconButton asChild title={returnLabel}>
      <Link to={returnTo} aria-label={returnLabel} onClick={() => onReturn?.()}>
        <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.25} />
      </Link>
    </ReaderIconButton>
  ) : (
    <ReaderIconButton asChild title="Home">
      <Link to="/home" aria-label="Back to home">
        <Home className="w-[18px] h-[18px]" strokeWidth={2} />
      </Link>
    </ReaderIconButton>
  );

  const [open, setOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("book");
  const [pickedBook, setPickedBook] = useState<BibleBook>(currentBook ?? books[0]!);
  const [pickedChapter, setPickedChapter] = useState<number>(currentChapter ?? 1);
  const [verseInput, setVerseInput] = useState("");

  useEffect(() => {
    if (focusMode) setOpen(false);
  }, [focusMode]);

  useEffect(() => {
    if (settingsOpenRequest < 1) return;
    setOpen(true);
    setSettingsDropdownOpen(true);
  }, [settingsOpenRequest]);

  const onOpenPicker = (next: boolean) => {
    setPickerOpen(next);
    if (next) {
      setStep("book");
      setPickedBook(currentBook);
      setPickedChapter(currentChapter);
      setVerseInput("");
    }
  };

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
    setPickerOpen(false);
  };

  const sameAsLoaded =
    !!currentBook && pickedBook?.abbr === currentBook.abbr && pickedChapter === currentChapter;
  const verseGridSize = sameAsLoaded && currentVerseCount > 0 ? currentVerseCount : 176;

  const pickerPopoverClass = cn(
    "p-0 border-0",
    readerGlassPanel,
    singlePage ? "w-[min(calc(100vw-1.5rem),560px)]" : "w-[min(94vw,560px)]",
  );

  const toolbarProps = {
    fontScale,
    onFontScaleChange,
    fontChoice,
    onFontChoiceChange,
    displayMode,
    onToggleDisplayMode,
    columnLayout,
    onToggleColumnLayout,
    studyLayoutPreference,
    onStudyLayoutPreferenceChange,
    inkMode,
    onToggleInkMode,
    onSearch,
    online,
    onToggleAudio,
    audioPlaying,
    audioLoading,
    audioDisabled,
    audioPlaybackRate,
    onCycleAudioSpeed,
    onBookmark,
    readerDark,
    onToggleReaderDark,
    bibleId,
    bibles,
    onChangeBible,
    settingsDropdownOpen,
    onSettingsDropdownOpenChange: setSettingsDropdownOpen,
    compact: singlePage,
    onChapterContext,
    showChapterContext,
  };

  return (
    <>
      {!open && !focusMode && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show header"
          className={`${overlayPos} left-1/2 ${readerChromeTopClass(hubCompactChrome)} -translate-x-1/2 z-30 px-4 py-1.5 rounded-full transition-all ${readerGlassHandle}`}
        >
          <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.25} />
        </button>
      )}

      {singlePage && focusMode && (
        <button
          type="button"
          onClick={onToggleFocus}
          aria-label="Exit Secret Place"
          className={`${overlayPos} right-4 top-[calc(var(--safe-area-inset-top)+0.75rem)] z-40 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${readerGlassBar} ${readerChromeText}`}
        >
          <EyeOff className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
          Exit Secret Place
        </button>
      )}

      <header
        className={`${overlayPos} top-0 inset-x-0 z-30 ${readerHeaderSafePaddingClass(hubCompactChrome)} transition-[transform,opacity] duration-300 ease-out ${
          open && !(singlePage && focusMode)
            ? "translate-y-0 opacity-100"
            : "-translate-y-[calc(100%+0.75rem)] opacity-0 pointer-events-none"
        }`}
      >
        {!(singlePage && focusMode) ? (
          <div
            className={cn(
              "mx-3 mt-2 max-w-3xl sm:mx-auto sm:px-2 flex items-center gap-2 rounded-2xl px-2 sm:px-3 py-2",
              readerGlassBar,
              !singlePage && "py-2.5 gap-3",
            )}
          >
            <div className="flex items-center gap-1 min-w-0 shrink max-w-[42%] sm:max-w-none">
              {homeControl}
              <Popover open={pickerOpen} onOpenChange={onOpenPicker} modal={singlePage}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 min-w-0 transition-colors hover:opacity-80",
                      readerChromeText,
                    )}
                    aria-label="Choose book, chapter, and verse"
                  >
                    <span className="font-system text-[15px] sm:text-[17px] font-semibold tracking-tight truncate">
                      {reference}
                    </span>
                    <ChevronDown
                      className={cn("w-4 h-4 shrink-0", readerChromeTextMuted)}
                      strokeWidth={2.25}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={10} className={pickerPopoverClass}>
                  <div className={readerPickerHeader}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {step !== "book" && (
                        <button
                          type="button"
                          onClick={() =>
                            setStep(step === "verse" && pickedBook.chapters > 1 ? "chapter" : "book")
                          }
                          aria-label="Back"
                          className={cn(readerPickerIconButton, "-ml-1")}
                        >
                          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}
                      <div className={readerPickerSectionLabel}>
                        {step === "book" && "Choose book"}
                        {step === "chapter" && (
                          <span>
                            <span className="text-zinc-800 normal-case tracking-normal text-sm font-semibold">
                              {pickedBook.name}
                            </span>
                            {" · choose chapter"}
                          </span>
                        )}
                        {step === "verse" && (
                          <span>
                            <span className="text-zinc-800 normal-case tracking-normal text-sm font-semibold">
                              {pickedBook.name} {pickedChapter}
                            </span>
                            {" · choose verse"}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      aria-label="Close"
                      className={readerPickerIconButton}
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>

                  {step === "book" && (
                    <div className="p-3 max-h-[min(55dvh,420px)] overflow-y-auto overscroll-contain">
                      <BookPickerStep
                        books={books}
                        currentBook={currentBook}
                        onPickBook={pickBook}
                        gridCols="responsive"
                      />
                    </div>
                  )}

                  {step === "chapter" && (
                    <div className="p-3">
                      <div className="max-h-[min(55dvh,420px)] overflow-y-auto overscroll-contain">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
                          {Array.from({ length: pickedBook.chapters }, (_, i) => i + 1).map((c) => {
                            const isCurrent =
                              pickedBook.abbr === currentBook.abbr && c === currentChapter;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => pickChapter(c)}
                                className={cn(
                                  "h-9 text-sm",
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
                    </div>
                  )}

                  {step === "verse" && (
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <button type="button" onClick={() => jump()} className={readerPickerSecondaryButton}>
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
                            className={cn("w-14", readerPickerInput)}
                          />
                          <button type="submit" className={readerPickerPrimaryButton}>
                            Go
                          </button>
                        </form>
                      </div>
                      <div className="max-h-[min(45dvh,360px)] overflow-y-auto overscroll-contain">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1.5">
                          {Array.from({ length: verseGridSize }, (_, i) => i + 1).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => jump(v)}
                              className={cn("h-8 text-xs", readerPickerGridButton)}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        {!sameAsLoaded && (
                          <p className="text-[11px] text-zinc-500 font-system text-center mt-3 italic">
                            Verse count unknown until the chapter loads — pick a number above or use the
                            box.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div
              className={cn(
                "flex items-center min-w-0 flex-1 justify-end",
                singlePage && "overflow-x-auto scrollbar-hide touch-pan-x",
              )}
            >
              {!focusMode ? <ReaderToolbarActions {...toolbarProps} /> : null}
              <ReaderIconButton onClick={onToggleFocus} title={focusMode ? "Exit focus mode" : "Secret Place"}>
                {focusMode ? (
                  <EyeOff className="w-[18px] h-[18px]" strokeWidth={2} />
                ) : (
                  <Eye className="w-[18px] h-[18px]" strokeWidth={2} />
                )}
              </ReaderIconButton>
              {onToggleHubFullscreen ? (
                <ReaderIconButton
                  onClick={onToggleHubFullscreen}
                  title={hubFullscreen ? "Exit full screen" : "Full screen"}
                >
                  {hubFullscreen ? (
                    <Minimize2 className="w-[18px] h-[18px]" strokeWidth={2} />
                  ) : (
                    <Maximize2 className="w-[18px] h-[18px]" strokeWidth={2} />
                  )}
                </ReaderIconButton>
              ) : null}
              <ReaderIconButton onClick={() => setOpen(false)} title="Hide header">
                <ChevronUp className="w-[18px] h-[18px]" strokeWidth={2.25} />
              </ReaderIconButton>
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
