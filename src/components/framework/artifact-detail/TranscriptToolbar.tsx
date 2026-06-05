import type { ReactNode } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  LocateFixed,
  MessageCircle,
  NotebookPen,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ClaimIconActionButton from "@/components/framework/ClaimIconActionButton";
import { artifactStudySectionTitle, sectionLabel } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onCopy: () => void;
  onJournal: () => void;
  fullPageJournalLabel: string;
  showTimestamps: boolean;
  onToggleTimestamps: () => void;
  isPlaying?: boolean;
  onTogglePlayback?: () => void;
  showPlaybackControl?: boolean;
  followPlayback: boolean;
  onToggleFollowPlayback: () => void;
  showFollowControl: boolean;
  extraActions?: ReactNode;
  formattingTranscript?: boolean;
  onFormatTranscript?: () => void;
  showFormatButton?: boolean;
  /** Overrides default subtitle under "Working transcript". */
  subtitle?: string;
  /** Mobile transcript tab: search + follow only. */
  compact?: boolean;
  hideTitle?: boolean;
  hideSecondaryActions?: boolean;
  /** Dark glass transcript panel (desktop). */
  inverted?: boolean;
  /** Light floating desktop study panel — icon row under search. */
  layout?: "default" | "desktopStudy";
};

export default function TranscriptToolbar({
  search,
  onSearchChange,
  onCopy,
  onJournal,
  fullPageJournalLabel,
  showTimestamps,
  onToggleTimestamps,
  isPlaying = false,
  onTogglePlayback,
  showPlaybackControl = false,
  followPlayback,
  onToggleFollowPlayback,
  showFollowControl,
  extraActions,
  formattingTranscript,
  onFormatTranscript,
  showFormatButton,
  subtitle = "Click a line to jump. Timestamps marked ~ are approximate.",
  compact = false,
  hideTitle = false,
  hideSecondaryActions = false,
  inverted = false,
  layout = "default",
}: Props) {
  const desktopStudy = layout === "desktopStudy";

  return (
    <div
      className={cn(
        "w-full min-w-0",
        desktopStudy ? "space-y-3.5 pb-4" : compact ? "space-y-2 pb-0" : "space-y-2.5",
        !compact &&
          !desktopStudy &&
          (inverted ? "border-b border-white/10 pb-3" : "border-b border-border/50 pb-3"),
        desktopStudy && "border-b border-border/45",
      )}
    >
      {!hideTitle ? (
        <div className="w-full min-w-0 space-y-1.5">
          <h2
            className={cn(
              desktopStudy
                ? cn(artifactStudySectionTitle, "text-xl")
                : "text-sm font-semibold tracking-tight",
              inverted ? "text-primary-foreground" : "text-foreground",
            )}
          >
            Working transcript
          </h2>
          <p
            className={cn(
              desktopStudy
                ? "text-xs leading-relaxed text-muted-foreground"
                : sectionLabel,
              inverted && "text-primary-foreground/55",
            )}
          >
            {subtitle}
          </p>
        </div>
      ) : subtitle ? (
        <p className={cn(sectionLabel, "sr-only")}>{subtitle}</p>
      ) : null}

      <div className="relative w-full min-w-0">
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            inverted ? "text-primary-foreground/50" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search transcript..."
          className={cn(
            "h-10 w-full min-w-0 pl-9 font-sans text-sm focus-visible:ring-primary/40",
            desktopStudy
              ? "rounded-full border border-border/55 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] dark:bg-card/90"
              : cn(
                  "shadow-none",
                  "border-0",
                  inverted
                    ? "bg-white/10 text-primary-foreground placeholder:text-primary-foreground/40 ring-1 ring-white/15"
                    : "bg-muted/30 ring-1 ring-border/50",
                ),
          )}
          aria-label="Search transcript"
        />
      </div>

      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-1",
          desktopStudy && "justify-between",
        )}
      >
        <div className="flex flex-wrap items-center gap-1">
          {!hideSecondaryActions ? (
            <>
              <ClaimIconActionButton label="Copy transcript" icon={Copy} tone="defer" onClick={onCopy} />
              <ClaimIconActionButton
                label={fullPageJournalLabel}
                icon={desktopStudy ? MessageCircle : NotebookPen}
                tone={desktopStudy ? "research" : "reflect"}
                onClick={onJournal}
              />
            </>
          ) : null}
          {!desktopStudy && showFormatButton && onFormatTranscript ? (
            <ClaimIconActionButton
              label={formattingTranscript ? "Formatting…" : "Format transcript"}
              icon={formattingTranscript ? Loader2 : Sparkles}
              tone="update"
              onClick={onFormatTranscript}
            />
          ) : null}
          {!desktopStudy ? extraActions : null}
          {!desktopStudy && showPlaybackControl && onTogglePlayback ? (
            <ClaimIconActionButton
              label={isPlaying ? "Pause video" : "Play video"}
              icon={isPlaying ? Pause : Play}
              tone="researchLater"
              active={isPlaying}
              onClick={onTogglePlayback}
            />
          ) : null}
          {!desktopStudy && showFollowControl ? (
            <ClaimIconActionButton
              label={followPlayback ? "Following playback" : "Follow playback"}
              icon={LocateFixed}
              tone="researchLater"
              active={followPlayback}
              onClick={onToggleFollowPlayback}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <ClaimIconActionButton
            label={showTimestamps ? "Hide timestamps" : "Show timestamps"}
            icon={showTimestamps ? EyeOff : Eye}
            tone="keep"
            active={!showTimestamps}
            onClick={onToggleTimestamps}
          />
          {desktopStudy && showFormatButton && onFormatTranscript ? (
            <ClaimIconActionButton
              label={formattingTranscript ? "Formatting…" : "Format transcript"}
              icon={formattingTranscript ? Loader2 : SlidersHorizontal}
              tone="defer"
              onClick={onFormatTranscript}
            />
          ) : desktopStudy ? (
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/50"
              aria-hidden
            >
              <SlidersHorizontal className="h-4 w-4" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
