import type { ReactNode, RefObject } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  NotebookPen,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  artifactDesktopHero,
  artifactDesktopInlineVideoShellExpanded,
  formatArtifactDate,
  formatArtifactDuration,
} from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";
import ArtifactChannelAvatar from "@/components/framework/artifact-detail/ArtifactChannelAvatar";

export type ArtifactDesktopHeroProps = {
  displayTitle: string;
  statusLabel: string;
  inFlight: boolean;
  channel?: string | null;
  channelUrl?: string | null;
  channelThumbnailUrl?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  durationSeconds?: number | null;
  createdAt?: string | null;
  backTo?: string;
  isPlaying?: boolean;
  onTogglePlay: () => void;
  onAddNote: () => void;
  onPasteTranscript?: () => void;
  onWrapUp?: () => void;
  onReanalyze?: () => void;
  showPaste?: boolean;
  showWrapUp?: boolean;
  showReanalyze?: boolean;
  /** Inline YouTube player (fills hero; PiP when scrolled away). */
  videoSlot?: ReactNode;
  /** Intersection observer anchor (whole hero card when inline video). */
  videoSlotRef?: RefObject<HTMLDivElement | null>;
  /** Player is in floating PiP — hero slot is an empty anchor only. */
  videoInPip?: boolean;
};

function HeroStatusBadge({ inFlight, statusLabel }: { inFlight: boolean; statusLabel: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        inFlight
          ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
          : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          inFlight ? "animate-pulse bg-amber-500" : "bg-emerald-500",
        )}
        aria-hidden
      />
      {inFlight ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden /> : null}
      {statusLabel}
    </span>
  );
}

function HeroMetaRow({
  channel,
  channelUrl,
  channelThumbnailUrl,
  durationLabel,
  dateLabel,
  inverted = false,
}: {
  channel?: string | null;
  channelUrl?: string | null;
  channelThumbnailUrl?: string | null;
  durationLabel: string | null;
  dateLabel: string | null;
  inverted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm",
        inverted ? "text-white/80" : "text-muted-foreground",
      )}
    >
      {channel ? (
        <span className="inline-flex min-w-0 items-center gap-2">
          <ArtifactChannelAvatar
            channel={channel}
            channelThumbnailUrl={channelThumbnailUrl}
            className={cn(
              "h-8 w-8 text-[10px] uppercase",
              inverted && "ring-white/20",
            )}
          />
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[10px] uppercase tracking-wider",
                inverted ? "text-white/50" : "text-muted-foreground/80",
              )}
            >
              Guest speaker
            </span>
            {channelUrl ? (
              <a
                href={channelUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "inline-flex min-w-0 items-center gap-1 font-medium hover:underline",
                  inverted ? "text-white" : "text-foreground",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{channel}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              </a>
            ) : (
              <span className={cn("truncate font-medium", inverted ? "text-white" : "text-foreground")}>
                {channel}
              </span>
            )}
          </span>
        </span>
      ) : null}
      {durationLabel ? <span className="tabular-nums">{durationLabel}</span> : null}
      {dateLabel ? <span className="tabular-nums opacity-80">{dateLabel}</span> : null}
    </div>
  );
}

function HeroActions({
  isPlaying,
  onTogglePlay,
  onAddNote,
  hasMenu,
  showPaste,
  showWrapUp,
  showReanalyze,
  onPasteTranscript,
  onWrapUp,
  onReanalyze,
  inverted = false,
  showPlayButton = true,
  compact = false,
}: {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onAddNote: () => void;
  hasMenu: boolean;
  showPaste: boolean;
  showWrapUp: boolean;
  showReanalyze: boolean;
  onPasteTranscript?: () => void;
  onWrapUp?: () => void;
  onReanalyze?: () => void;
  inverted?: boolean;
  showPlayButton?: boolean;
  compact?: boolean;
}) {
  const btnSize = compact ? "sm" : "lg";
  const btnH = compact ? "h-9" : "h-11";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showPlayButton ? (
        <Button
          type="button"
          size={btnSize}
          className={cn(
            btnH,
            "gap-2 rounded-full px-6 text-sm font-semibold",
            inverted && "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
          )}
          onClick={onTogglePlay}
        >
          <Play className="h-4 w-4 shrink-0 fill-current" aria-hidden />
          {isPlaying ? "Pause" : "Play"}
        </Button>
      ) : null}
      <Button
        type="button"
        size={btnSize}
        variant="outline"
        className={cn(
          btnH,
          "gap-2 rounded-full px-4 text-sm font-medium",
          inverted && "border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white",
        )}
        onClick={onAddNote}
      >
        <NotebookPen className="h-4 w-4 shrink-0" aria-hidden />
        Add note
      </Button>
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={cn(
                compact ? "h-9 w-9 rounded-full" : "h-11 w-11 rounded-full",
                inverted && "border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white",
              )}
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {showPaste && onPasteTranscript ? (
              <DropdownMenuItem onClick={onPasteTranscript}>Paste transcript</DropdownMenuItem>
            ) : null}
            {showWrapUp && onWrapUp ? (
              <DropdownMenuItem onClick={onWrapUp}>Wrap up</DropdownMenuItem>
            ) : null}
            {showReanalyze && onReanalyze ? (
              <DropdownMenuItem onClick={onReanalyze}>Re-analyze</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export default function ArtifactDesktopHero({
  displayTitle,
  statusLabel,
  inFlight,
  channel,
  channelUrl,
  channelThumbnailUrl,
  thumbnailUrl,
  youTubeVideoId,
  durationSeconds,
  createdAt,
  backTo = "/framework/artifacts",
  isPlaying = false,
  onTogglePlay,
  onAddNote,
  onPasteTranscript,
  onWrapUp,
  onReanalyze,
  showPaste = false,
  showWrapUp = false,
  showReanalyze = false,
  videoSlot,
  videoSlotRef,
  videoInPip = false,
}: ArtifactDesktopHeroProps) {
  const thumb = thumbnailUrl || (youTubeVideoId ? youtubeHqThumbnail(youTubeVideoId) : null);
  const durationLabel = formatArtifactDuration(durationSeconds);
  const dateLabel = formatArtifactDate(createdAt);
  const hasMenu = showPaste || showWrapUp || showReanalyze;
  const hasInlineVideo = Boolean(videoSlot);

  if (hasInlineVideo) {
    return (
      <section
        ref={videoSlotRef}
        className={cn(
          "relative mb-3 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]",
        )}
        aria-label="Video"
      >
        <h1 className="sr-only">{displayTitle}</h1>
        <div id="video" className={artifactDesktopInlineVideoShellExpanded}>
          {videoSlot}
        </div>
        {videoInPip ? (
          <p className="sr-only">
            Video is in picture-in-picture. Use restore on the floating player to return it here.
          </p>
        ) : null}
      </section>
    );
  }

  const chromeHidden = isPlaying;

  return (
    <section
      className={cn(artifactDesktopHero, chromeHidden && "group/hero")}
      aria-label="Artifact overview"
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className={cn(
            "absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-300",
            chromeHidden && "opacity-0",
          )}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-950 transition-opacity duration-300",
            chromeHidden && "opacity-0",
          )}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/85 via-black/55 to-black/25 transition-opacity duration-300",
          chromeHidden && "opacity-0 group-hover/hero:opacity-100",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[3] bg-gradient-to-r from-black/40 via-transparent to-black/20 transition-opacity duration-300",
          chromeHidden && "opacity-0 group-hover/hero:opacity-100",
        )}
        aria-hidden
      />

      <div
        className={cn(
          "relative z-[4] flex min-h-[inherit] flex-col justify-end px-5 pb-10 pt-16 transition-opacity duration-300 sm:px-8 sm:pb-12",
          chromeHidden &&
            "pointer-events-none opacity-0 group-hover/hero:pointer-events-auto group-hover/hero:opacity-100",
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/75 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Back to artifacts
          </Link>
          <HeroStatusBadge inFlight={inFlight} statusLabel={statusLabel} />
        </div>

        <h1 className="max-w-4xl font-display text-2xl font-normal leading-[1.15] tracking-tight text-white sm:text-[2rem] lg:text-[2.35rem]">
          {displayTitle}
        </h1>

        <HeroMetaRow
          channel={channel}
          channelUrl={channelUrl}
          channelThumbnailUrl={channelThumbnailUrl}
          durationLabel={durationLabel}
          dateLabel={dateLabel}
          inverted
        />

        <HeroActions
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onAddNote={onAddNote}
          hasMenu={hasMenu}
          showPaste={showPaste}
          showWrapUp={showWrapUp}
          showReanalyze={showReanalyze}
          onPasteTranscript={onPasteTranscript}
          onWrapUp={onWrapUp}
          onReanalyze={onReanalyze}
          inverted
        />
      </div>
    </section>
  );
}
