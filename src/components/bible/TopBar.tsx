import { Link } from "react-router-dom";
import { Eye, EyeOff, Moon, Sun, Settings, BookmarkPlus, ChevronDown, ChevronUp, ChevronLeft, X, Minus, Plus, Network, Menu, Languages, PenLine, Search, Volume2, Pause, Loader2, Type, Home, Maximize2, Minimize2, ScrollText, BookOpen, Columns2, List } from "lucide-react";
import { BookPickerStep } from "@/components/bible/BookPickerStep";
import { ReaderFontPicker } from "@/components/bible/ReaderFontPicker";
import { ReaderIconButton } from "@/components/bible/ReaderIconButton";
import { ReaderMobileMenu, type ReaderMenuPanel } from "@/components/bible/ReaderMobileMenu";
import { fontChoiceLabel } from "@/lib/bible/fontChoices";
import {
  READER_FONT_SCALE_DEFAULT,
  READER_FONT_SCALE_MAX,
  READER_FONT_SCALE_MIN,
} from "@/lib/bible/readerFontScale";
import {
  readerChromeText,
  readerChromeTextMuted,
  readerFontScaleGroup,
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
import type { FontChoiceId } from "@/lib/bible/fontChoices";
import { readerOverlayPosition } from "@/lib/bible/readerHubLayout";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BibleEntry } from "@/lib/bible/api";
import type { ReaderColumnLayout } from "@/lib/bible/readerColumnLayout";
import type { BibleBook } from "@/data/books";
import { getBooks } from "@/lib/bible/canon";
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
  /** Active canon book list */
  books?: BibleBook[];
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
  fontChoice?: string;
  onFontChoiceChange?: (choice: FontChoiceId) => void;
  /** Viewport under READER_SINGLE_PAGE_MAX — compact chrome + menu sheet */
  singlePage?: boolean;
  /** Increment to open reader settings (e.g. footer book name tap). */
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
  audioPlaybackRate?: number;
  onCycleAudioSpeed?: () => void;
  /** Position chrome within the hub workspace card instead of the viewport. */
  containedInHub?: boolean;
  hubFullscreen?: boolean;
  onToggleHubFullscreen?: () => void;
  /** When set, shows a back control to return to the calling flow (e.g. Morning formula). */
  returnTo?: string;
  returnLabel?: string;
  onReturn?: () => void;
}

type PickerStep = "book" | "chapter" | "verse";

export function TopBar({
  reference, collapsed: _collapsed, focusMode, onToggleFocus,
  bibleId, bibles, onChangeBible, onBookmark,
  books: booksProp, currentBook, currentChapter, currentVerseCount, onJumpTo,
  fontScale, onFontScaleChange,
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
  audioPlaybackRate = 1,
  onCycleAudioSpeed,
  containedInHub = false,
  hubFullscreen = false,
  onToggleHubFullscreen,
  returnTo,
  returnLabel = "Back",
  onReturn,
}: Props) {
  const overlayPos = readerOverlayPosition(containedInHub);
  const books = booksProp ?? getBooks();
  const current = bibles.find(b => b.id === bibleId);

  const homeControl = returnTo ? (
    <ReaderIconButton asChild title={returnLabel}>
      <Link
        to={returnTo}
        aria-label={returnLabel}
        onClick={() => onReturn?.()}
      >
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuPanel, setMobileMenuPanel] = useState<ReaderMenuPanel>("nav");
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);

  useEffect(() => {
    if (focusMode) setOpen(false);
  }, [focusMode]);

  useEffect(() => {
    if (settingsOpenRequest < 1) return;
    if (singlePage) {
      setMobileMenuPanel("settings");
      setMobileMenuOpen(true);
      return;
    }
    setOpen(true);
    setSettingsDropdownOpen(true);
  }, [settingsOpenRequest, singlePage]);

  // Reference picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [step, setStep] = useState<PickerStep>("book");
  const [pickedBook, setPickedBook] = useState<BibleBook>(currentBook ?? books[0]!);
  const [pickedChapter, setPickedChapter] = useState<number>(currentChapter ?? 1);

  const onOpenPicker = (next: boolean) => {
    setPickerOpen(next);
    if (next) {
      // Reset to "book" each time it opens, seeded with the current book/chapter
      setStep("book");
      setPickedBook(currentBook);
      setPickedChapter(currentChapter);
    }
  };

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
      {!open && !focusMode && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show header"
          className={`${overlayPos} left-1/2 top-[calc(var(--safe-area-inset-top)+0.35rem)] -translate-x-1/2 z-30 px-4 py-1.5 rounded-full transition-all ${readerGlassHandle}`}
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

      {singlePage && (
        <ReaderMobileMenu
          open={mobileMenuOpen}
          onOpenChange={(next) => {
            setMobileMenuOpen(next);
            if (!next) setMobileMenuPanel("nav");
          }}
          initialPanel={mobileMenuPanel}
          reference={reference}
          books={books}
          currentBook={currentBook}
          currentChapter={currentChapter}
          currentVerseCount={currentVerseCount}
          onJumpTo={onJumpTo}
          bibleId={bibleId}
          bibles={bibles}
          onChangeBible={onChangeBible}
          fontScale={fontScale}
          onFontScaleChange={onFontScaleChange}
          fontChoice={fontChoice}
          onFontChoiceChange={onFontChoiceChange}
          onBookmark={onBookmark}
          focusMode={focusMode}
          onToggleFocus={onToggleFocus}
          inkMode={inkMode}
          onToggleInkMode={onToggleInkMode}
          onSearch={onSearch}
          onToggleAudio={onToggleAudio}
          audioPlaying={audioPlaying}
          audioLoading={audioLoading}
          audioDisabled={audioDisabled}
          online={online}
          displayMode={displayMode}
          onToggleDisplayMode={onToggleDisplayMode}
          readerDark={readerDark}
          onToggleReaderDark={onToggleReaderDark}
          columnLayout={columnLayout}
          onToggleColumnLayout={onToggleColumnLayout}
        />
      )}

      <header
        className={`${overlayPos} top-0 inset-x-0 z-30 pt-[var(--safe-area-inset-top)] transition-[transform,opacity] duration-300 ease-out ${
          open && !(singlePage && focusMode) ? "translate-y-0 opacity-100" : "-translate-y-[calc(100%+0.75rem)] opacity-0 pointer-events-none"
        }`}
      >
        {singlePage && !focusMode ? (
        <div className={`mx-3 mt-2 max-w-3xl sm:mx-auto sm:px-2 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 ${readerGlassBar}`}>
          <div className="flex items-center gap-1 min-w-0">
            {homeControl}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`flex items-center gap-1.5 min-w-0 transition-colors hover:opacity-80 ${readerChromeText}`}
              aria-label="Open reader menu"
            >
              <span className="font-system text-[17px] font-semibold tracking-tight truncate">{reference}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 ${readerChromeTextMuted}`} strokeWidth={2.25} />
            </button>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {onToggleInkMode ? (
              <ReaderIconButton
                onClick={onToggleInkMode}
                title={inkMode ? "Exit ink mode" : "Write on page"}
                active={inkMode}
                ariaPressed={inkMode}
              >
                <PenLine className="w-[18px] h-[18px]" strokeWidth={2} />
              </ReaderIconButton>
            ) : null}
            <ReaderIconButton onClick={() => setMobileMenuOpen(true)} title="Reader menu">
              <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
            </ReaderIconButton>
            <ReaderIconButton onClick={onToggleFocus} title={focusMode ? "Exit focus mode" : "Secret Place"}>
              {focusMode ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={2} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={2} />}
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
        ) : singlePage && focusMode ? null : (
        <div className={`mx-3 mt-2 max-w-3xl sm:mx-auto sm:px-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 ${readerGlassBar}`}>
        <div className="flex items-center gap-2 min-w-0 pl-2">
          {homeControl}
          {/* Reference picker — book / chapter / verse */}
          <Popover open={pickerOpen} onOpenChange={onOpenPicker}>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-1.5 transition-colors hover:opacity-80 ${readerChromeText}`}>
                <span className="font-system text-[17px] font-semibold tracking-tight transition-all">{reference}</span>
                <ChevronDown className={`w-4 h-4 ${readerChromeTextMuted}`} strokeWidth={2.25} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={10}
              className={cn("w-[min(94vw,560px)] p-0 border-0", readerGlassPanel)}
            >
              {/* Header / breadcrumb */}
              <div className={readerPickerHeader}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {step !== "book" && (
                    <button
                      onClick={() => setStep(step === "verse" && pickedBook.chapters > 1 ? "chapter" : "book")}
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
                        <span className="text-zinc-800 normal-case tracking-normal text-sm font-semibold">{pickedBook.name}</span>
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
                  onClick={() => setPickerOpen(false)}
                  aria-label="Close"
                  className={readerPickerIconButton}
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              {/* Body */}
              {step === "book" && (
                <div className="p-3 max-h-[55vh] overflow-y-auto">
                  <BookPickerStep books={books} currentBook={currentBook} onPickBook={pickBook} gridCols="responsive" />
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
                    <button
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
                        className={cn("w-14", readerPickerInput)}
                      />
                      <button
                        type="submit"
                        className={readerPickerPrimaryButton}
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
                          className={cn("h-8 text-xs", readerPickerGridButton)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    {!sameAsLoaded && (
                      <div className="text-[11px] text-zinc-500 font-system text-center mt-3 italic">
                        Verse count unknown until the chapter loads — pick a number above or use the box.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>

        </div>

        <div className="flex items-center gap-1">
          {!focusMode && (
            <>
              {/* Text size — A−  ⏤  A+  with current % readout (click to reset) */}
              <div className={`${readerFontScaleGroup} mr-1`}>
                <button
                  type="button"
                  onClick={() =>
                    onFontScaleChange(Math.max(READER_FONT_SCALE_MIN, +(fontScale - 0.1).toFixed(2)))
                  }
                  aria-label="Smaller text"
                  title="Smaller text"
                  className={`p-1 rounded-full ${readerChromeTextMuted} hover:text-zinc-800 hover:bg-white/50 transition-colors disabled:opacity-40`}
                  disabled={fontScale <= READER_FONT_SCALE_MIN + 0.001}
                >
                  <Minus className="w-3 h-3" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => onFontScaleChange(READER_FONT_SCALE_DEFAULT)}
                  aria-label={`Reset text size (current: ${Math.round(fontScale * 100)}%)`}
                  title="Reset text size"
                  className={`px-1 text-[10px] font-mono tabular-nums ${readerChromeTextMuted} hover:text-zinc-800 transition-colors min-w-[2.6rem] text-center`}
                >
                  {Math.round(fontScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onFontScaleChange(Math.min(READER_FONT_SCALE_MAX, +(fontScale + 0.1).toFixed(2)))
                  }
                  aria-label="Larger text"
                  title="Larger text"
                  className={`p-1 rounded-full ${readerChromeTextMuted} hover:text-zinc-800 hover:bg-white/50 transition-colors disabled:opacity-40`}
                  disabled={fontScale >= READER_FONT_SCALE_MAX - 0.001}
                >
                  <Plus className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
              {onFontChoiceChange ? (
                <Popover open={fontPickerOpen} onOpenChange={setFontPickerOpen}>
                  <PopoverTrigger asChild>
                    <ReaderIconButton title="Scripture font">
                      <Type className="w-[18px] h-[18px]" strokeWidth={2} />
                    </ReaderIconButton>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Scripture font</p>
                    <ReaderFontPicker
                      value={fontChoice}
                      onChange={(choice) => {
                        onFontChoiceChange(choice);
                        setFontPickerOpen(false);
                      }}
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground">{fontChoiceLabel(fontChoice)} selected</p>
                  </PopoverContent>
                </Popover>
              ) : null}
              {onToggleDisplayMode ? (
                <ReaderIconButton
                  onClick={onToggleDisplayMode}
                  title={displayMode === "scroll" ? "Switch to page mode" : "Switch to scroll mode"}
                  active={displayMode === "scroll"}
                  ariaPressed={displayMode === "scroll"}
                >
                  {displayMode === "scroll" ? (
                    <ScrollText className="w-[18px] h-[18px]" strokeWidth={2} />
                  ) : (
                    <BookOpen className="w-[18px] h-[18px]" strokeWidth={2} />
                  )}
                </ReaderIconButton>
              ) : null}
              {onToggleColumnLayout ? (
                <ReaderIconButton
                  onClick={onToggleColumnLayout}
                  title={
                    columnLayout === "double"
                      ? "Single column per page"
                      : "Two columns per page (like a printed Bible)"
                  }
                  active={columnLayout === "double"}
                  ariaPressed={columnLayout === "double"}
                >
                  <Columns2 className="w-[18px] h-[18px]" strokeWidth={2} />
                </ReaderIconButton>
              ) : null}
              {onToggleInkMode ? (
              <ReaderIconButton
                onClick={onToggleInkMode}
                title={inkMode ? "Exit ink mode" : "Write on page (ink mode)"}
                active={inkMode}
                ariaPressed={inkMode}
              >
                <PenLine className="w-[18px] h-[18px]" strokeWidth={2} />
              </ReaderIconButton>
              ) : null}
              {onSearch ? (
                <ReaderIconButton
                  onClick={onSearch}
                  title={online ? "Search Scripture" : "Search requires internet"}
                  disabled={!online}
                >
                  <Search className="w-[18px] h-[18px]" strokeWidth={2} />
                </ReaderIconButton>
              ) : null}
              {onToggleAudio ? (
                <ReaderIconButton
                  onClick={onToggleAudio}
                  onContextMenu={(e) => {
                    if (!onCycleAudioSpeed) return;
                    e.preventDefault();
                    onCycleAudioSpeed();
                  }}
                  title={
                    audioDisabled
                      ? "Audio unavailable offline"
                      : audioPlaying
                        ? `Pause chapter audio (${audioPlaybackRate}x — right-click for speed)`
                        : `Listen to chapter (${audioPlaybackRate}x — right-click for speed)`
                  }
                  disabled={audioDisabled || audioLoading}
                  active={audioPlaying}
                  ariaPressed={audioPlaying}
                >
                  {audioLoading ? (
                    <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden />
                  ) : audioPlaying ? (
                    <Pause className="w-[18px] h-[18px]" strokeWidth={2} />
                  ) : (
                    <Volume2 className="w-[18px] h-[18px]" strokeWidth={2} />
                  )}
                </ReaderIconButton>
              ) : null}
              <ReaderIconButton onClick={onBookmark} title="Bookmark this page">
                <BookmarkPlus className="w-[18px] h-[18px]" strokeWidth={2} />
              </ReaderIconButton>
              {onToggleReaderDark ? (
                <ReaderIconButton
                  onClick={onToggleReaderDark}
                  title={readerDark ? "Light page" : "Dark page"}
                  active={readerDark}
                  ariaPressed={readerDark}
                >
                  {readerDark ? (
                    <Sun className="w-[18px] h-[18px]" strokeWidth={2} />
                  ) : (
                    <Moon className="w-[18px] h-[18px]" strokeWidth={2} />
                  )}
                </ReaderIconButton>
              ) : (
                <ReaderIconButton asChild title="Sleep mode">
                  <Link to="/sleep">
                    <Moon className="w-[18px] h-[18px]" strokeWidth={2} />
                  </Link>
                </ReaderIconButton>
              )}
              <ReaderIconButton asChild title="My Framework">
                <Link to="/framework">
                  <Network className="w-[18px] h-[18px]" strokeWidth={2} />
                </Link>
              </ReaderIconButton>
              <DropdownMenu open={settingsDropdownOpen} onOpenChange={setSettingsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <ReaderIconButton title="Settings">
                    <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
                  </ReaderIconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2">
                      <Languages className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        {current?.abbreviation ?? "Translation"}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                      {bibles.length === 0 && <DropdownMenuItem disabled>Loading…</DropdownMenuItem>}
                      {bibles.map((b) => (
                        <DropdownMenuItem
                          key={b.id}
                          onClick={() => onChangeBible(b.id)}
                          className={bibleId === b.id ? "font-semibold" : ""}
                        >
                          <span className="font-mono text-xs text-muted-foreground mr-2">{b.abbreviation}</span>
                          {b.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {onToggleColumnLayout ? (
                    <DropdownMenuCheckboxItem
                      checked={columnLayout === "double"}
                      onCheckedChange={() => onToggleColumnLayout()}
                      className="gap-2"
                    >
                      <Columns2 className="w-3.5 h-3.5 text-muted-foreground" />
                      Two columns per page
                    </DropdownMenuCheckboxItem>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link to="/read/contents" className="gap-2">
                      <List className="w-3.5 h-3.5 text-muted-foreground" />
                      Table of contents
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">All settings</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <ReaderIconButton onClick={onToggleFocus} title={focusMode ? "Exit focus mode" : "Enter Secret Place (focus)"}>
            {focusMode ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={2} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={2} />}
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
        )}
      </header>
    </>
  );
}

