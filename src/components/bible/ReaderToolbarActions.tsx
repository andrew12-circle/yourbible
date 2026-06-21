import { Link } from "react-router-dom";
import {
  BookmarkPlus,
  BookOpen,
  Columns2,
  Languages,
  List,
  Loader2,
  Minus,
  Moon,
  Network,
  Pause,
  PenLine,
  Plus,
  ScrollText,
  Search,
  Settings,
  Sun,
  Type,
  Volume2,
} from "lucide-react";
import { ReaderFontPicker } from "@/components/bible/ReaderFontPicker";
import { ReaderIconButton } from "@/components/bible/ReaderIconButton";
import type { FontChoiceId } from "@/lib/bible/fontChoices";
import { fontChoiceLabel } from "@/lib/bible/fontChoices";
import {
  READER_FONT_SCALE_DEFAULT,
  READER_FONT_SCALE_MAX,
  READER_FONT_SCALE_MIN,
} from "@/lib/bible/readerFontScale";
import type { ReaderColumnLayout } from "@/lib/bible/readerColumnLayout";
import {
  isStudyBibleEdition,
  studyLayoutPreferenceDescription,
  studyLayoutPreferenceLabel,
  type ReaderStudyLayoutPreference,
} from "@/lib/bible/readerStudyLayout";
import {
  readerChromeTextMuted,
  readerFontScaleGroup,
} from "@/lib/bible/readerChromeClasses";
import type { BibleEntry } from "@/lib/bible/api";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface ReaderToolbarActionsProps {
  fontScale: number;
  onFontScaleChange: (next: number) => void;
  fontChoice?: string;
  onFontChoiceChange?: (choice: FontChoiceId) => void;
  displayMode?: "scroll" | "pages";
  onToggleDisplayMode?: () => void;
  columnLayout?: ReaderColumnLayout;
  onToggleColumnLayout?: () => void;
  inkMode?: boolean;
  onToggleInkMode?: () => void;
  onSearch?: () => void;
  online?: boolean;
  onToggleAudio?: () => void;
  audioPlaying?: boolean;
  audioLoading?: boolean;
  audioDisabled?: boolean;
  audioPlaybackRate?: number;
  onCycleAudioSpeed?: () => void;
  onBookmark: () => void;
  readerDark?: boolean;
  onToggleReaderDark?: () => void;
  bibleId: string;
  bibles: BibleEntry[];
  onChangeBible: (id: string) => void;
  settingsDropdownOpen?: boolean;
  onSettingsDropdownOpenChange?: (open: boolean) => void;
  studyLayoutPreference?: ReaderStudyLayoutPreference;
  onStudyLayoutPreferenceChange?: (next: ReaderStudyLayoutPreference) => void;
  /** Tighter spacing for phone / tablet portrait header. */
  compact?: boolean;
}

export function ReaderToolbarActions({
  fontScale,
  onFontScaleChange,
  fontChoice,
  onFontChoiceChange,
  displayMode = "pages",
  onToggleDisplayMode,
  columnLayout = "single",
  onToggleColumnLayout,
  inkMode = false,
  onToggleInkMode,
  onSearch,
  online = true,
  onToggleAudio,
  audioPlaying = false,
  audioLoading = false,
  audioDisabled = false,
  audioPlaybackRate = 1,
  onCycleAudioSpeed,
  onBookmark,
  readerDark = false,
  onToggleReaderDark,
  bibleId,
  bibles,
  onChangeBible,
  settingsDropdownOpen,
  onSettingsDropdownOpenChange,
  studyLayoutPreference = "inline",
  onStudyLayoutPreferenceChange,
  compact = false,
}: ReaderToolbarActionsProps) {
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const current = bibles.find((b) => b.id === bibleId);
  const showStudyLayout = isStudyBibleEdition(current?.abbreviation);
  const scaleBtn = compact ? "p-1" : "p-1";
  const scaleIcon = compact ? "w-3 h-3" : "w-3 h-3";

  return (
    <div className={cn("flex items-center gap-0.5 shrink-0", compact && "pr-0.5")}>
      <div className={cn(readerFontScaleGroup, compact ? "mr-0.5" : "mr-1")}>
        <button
          type="button"
          onClick={() =>
            onFontScaleChange(Math.max(READER_FONT_SCALE_MIN, +(fontScale - 0.1).toFixed(2)))
          }
          aria-label="Smaller text"
          title="Smaller text"
          className={cn(
            scaleBtn,
            "rounded-full",
            readerChromeTextMuted,
            "hover:text-zinc-800 hover:bg-white/50 transition-colors disabled:opacity-40",
          )}
          disabled={fontScale <= READER_FONT_SCALE_MIN + 0.001}
        >
          <Minus className={scaleIcon} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => onFontScaleChange(READER_FONT_SCALE_DEFAULT)}
          aria-label={`Reset text size (current: ${Math.round(fontScale * 100)}%)`}
          title="Reset text size"
          className={cn(
            "px-1 font-mono tabular-nums text-center hover:text-zinc-800 transition-colors",
            readerChromeTextMuted,
            compact ? "text-[10px] min-w-[2.4rem]" : "text-[10px] min-w-[2.6rem]",
          )}
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
          className={cn(
            scaleBtn,
            "rounded-full",
            readerChromeTextMuted,
            "hover:text-zinc-800 hover:bg-white/50 transition-colors disabled:opacity-40",
          )}
          disabled={fontScale >= READER_FONT_SCALE_MAX - 0.001}
        >
          <Plus className={scaleIcon} strokeWidth={2.5} />
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Scripture font
            </p>
            <ReaderFontPicker
              value={fontChoice}
              onChange={(choice) => {
                onFontChoiceChange(choice);
                setFontPickerOpen(false);
              }}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {fontChoiceLabel(fontChoice)} selected
            </p>
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

      <DropdownMenu open={settingsDropdownOpen} onOpenChange={onSettingsDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <ReaderIconButton title="Settings">
            <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
          </ReaderIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Languages className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{current?.abbreviation ?? "Translation"}</span>
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
          {showStudyLayout && onStudyLayoutPreferenceChange ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">Study notes layout</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64">
                  <DropdownMenuRadioGroup
                    value={studyLayoutPreference}
                    onValueChange={(value) =>
                      onStudyLayoutPreferenceChange(value as ReaderStudyLayoutPreference)
                    }
                  >
                    {(["inline", "auto", "holman"] as const).map((value) => (
                      <DropdownMenuRadioItem key={value} value={value} className="items-start py-2">
                        <span className="flex flex-col gap-0.5">
                          <span>{studyLayoutPreferenceLabel(value)}</span>
                          <span className="text-[10px] font-normal text-muted-foreground leading-snug">
                            {studyLayoutPreferenceDescription(value)}
                          </span>
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] font-normal leading-snug text-muted-foreground whitespace-normal">
            {current
              ? `Scripture${showStudyLayout ? " and study notes" : ""} from ${current.name} (${current.abbreviation}) via API.Bible.`
              : "Scripture text via API.Bible."}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
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
    </div>
  );
}
