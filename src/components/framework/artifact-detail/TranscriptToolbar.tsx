import type { ReactNode } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  LocateFixed,
  NotebookPen,
  Pause,
  Play,
  Search,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ClaimIconActionButton from "@/components/framework/ClaimIconActionButton";
import { sectionLabel } from "@/lib/framework/artifactSurfaces";
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
}: Props) {
  return (
    <div
      className={cn(
        "w-full min-w-0 space-y-2.5",
        !compact && "border-b border-border/50 pb-3",
        compact && "space-y-2 pb-0",
      )}
    >
      {!hideTitle ? (
        <div className="w-full min-w-0 space-y-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Working transcript</h2>
          <p className={sectionLabel}>{subtitle}</p>
        </div>
      ) : subtitle ? (
        <p className={cn(sectionLabel, "sr-only")}>{subtitle}</p>
      ) : null}

      <div className="relative w-full min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search transcript…"
          className="h-10 w-full min-w-0 border-0 bg-muted/30 pl-9 font-sans text-sm shadow-none ring-1 ring-border/50 focus-visible:ring-primary/40"
          aria-label="Search transcript"
        />
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5">
        {!hideSecondaryActions ? (
          <>
            <ClaimIconActionButton label="Copy transcript" icon={Copy} tone="defer" onClick={onCopy} />
            <ClaimIconActionButton label={fullPageJournalLabel} icon={NotebookPen} tone="reflect" onClick={onJournal} />
          </>
        ) : null}
        {showFormatButton && onFormatTranscript ? (
          <ClaimIconActionButton
            label={formattingTranscript ? "Formatting…" : "Format transcript"}
            icon={formattingTranscript ? Loader2 : Sparkles}
            tone="update"
            onClick={onFormatTranscript}
          />
        ) : null}
        {extraActions}
        <ClaimIconActionButton
          label={showTimestamps ? "Hide timestamps" : "Show timestamps"}
          icon={showTimestamps ? EyeOff : Eye}
          tone="keep"
          active={!showTimestamps}
          onClick={onToggleTimestamps}
        />
        {showPlaybackControl && onTogglePlayback ? (
          <ClaimIconActionButton
            label={isPlaying ? "Pause video" : "Play video"}
            icon={isPlaying ? Pause : Play}
            tone="researchLater"
            active={isPlaying}
            onClick={onTogglePlayback}
          />
        ) : null}
        {showFollowControl ? (
          <ClaimIconActionButton
            label={followPlayback ? "Following playback" : "Follow playback"}
            icon={LocateFixed}
            tone="researchLater"
            active={followPlayback}
            onClick={onToggleFollowPlayback}
          />
        ) : null}
      </div>
    </div>
  );
}
