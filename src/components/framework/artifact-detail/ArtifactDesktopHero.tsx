import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  NotebookPen,
  Play,
  Youtube,
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
  formatArtifactDate,
  formatArtifactDuration,
} from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

export type ArtifactDesktopHeroProps = {
  displayTitle: string;
  statusLabel: string;
  inFlight: boolean;
  channel?: string | null;
  channelUrl?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  durationSeconds?: number | null;
  createdAt?: string | null;
  backTo?: string;
  isPlaying?: boolean;
  onPlayStudy: () => void;
  onPlayVideo: () => void;
  onAddNote: () => void;
  onPasteTranscript?: () => void;
  onWrapUp?: () => void;
  onReanalyze?: () => void;
  showPaste?: boolean;
  showWrapUp?: boolean;
  showReanalyze?: boolean;
  /** Inline YouTube player (fills hero; PiP when scrolled away). */
  videoSlot?: ReactNode;
};

export default function ArtifactDesktopHero({
  displayTitle,
  statusLabel,
  inFlight,
  channel,
  channelUrl,
  thumbnailUrl,
  youTubeVideoId,
  durationSeconds,
  createdAt,
  backTo = "/framework/artifacts",
  isPlaying = false,
  onPlayStudy,
  onPlayVideo,
  onAddNote,
  onPasteTranscript,
  onWrapUp,
  onReanalyze,
  showPaste = false,
  showWrapUp = false,
  showReanalyze = false,
  videoSlot,
}: ArtifactDesktopHeroProps) {
  const thumb = thumbnailUrl || (youTubeVideoId ? youtubeHqThumbnail(youTubeVideoId) : null);
  const durationLabel = formatArtifactDuration(durationSeconds);
  const dateLabel = formatArtifactDate(createdAt);
  const hasMenu = showPaste || showWrapUp || showReanalyze;

  return (
    <section className={artifactDesktopHero} aria-label="Artifact overview">
      {thumb ? (
        <img src={thumb} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />
      ) : (
        <div
          className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-950"
          aria-hidden
        />
      )}
      {videoSlot ? (
        <div className="absolute inset-0 z-[1] overflow-hidden">{videoSlot}</div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/55 to-black/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/40 via-transparent to-black/20"
        aria-hidden
      />

      <div className="relative z-[2] flex min-h-[inherit] flex-col justify-end px-5 pb-10 pt-16 sm:px-8 sm:pb-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/75 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Back to artifacts
          </Link>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
              inFlight
                ? "bg-amber-500/20 text-amber-100"
                : "bg-emerald-500/20 text-emerald-100",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                inFlight ? "animate-pulse bg-amber-400" : "bg-emerald-400",
              )}
              aria-hidden
            />
            {inFlight ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden /> : null}
            {statusLabel}
          </span>
        </div>

        <h1 className="max-w-4xl font-display text-2xl font-normal leading-[1.15] tracking-tight text-white sm:text-[2rem] lg:text-[2.35rem]">
          {displayTitle}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
          {channel ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-semibold uppercase ring-1 ring-white/20">
                {channel.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wider text-white/50">Guest speaker</span>
                {channelUrl ? (
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 font-medium text-white hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate">{channel}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                  </a>
                ) : (
                  <span className="truncate font-medium text-white">{channel}</span>
                )}
              </span>
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-white/70">
            <Youtube className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
            YouTube
          </span>
          {durationLabel ? (
            <span className="tabular-nums text-white/70">{durationLabel}</span>
          ) : null}
          {dateLabel ? (
            <span className="tabular-nums text-white/60">{dateLabel}</span>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            size="lg"
            className="h-11 gap-2 rounded-full bg-violet-600 px-6 text-sm font-semibold text-white shadow-lg hover:bg-violet-700"
            onClick={onPlayStudy}
          >
            <Play className="h-4 w-4 shrink-0 fill-current" aria-hidden />
            Play study
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 gap-2 rounded-full border-white/40 bg-white/95 px-5 text-sm font-semibold text-slate-900 shadow-md hover:bg-white"
            onClick={onPlayVideo}
          >
            <Youtube className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
            {isPlaying ? "Pause video" : "Play video"}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 gap-2 rounded-full border-white/35 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
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
                  className="h-11 w-11 rounded-full border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
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
      </div>
    </section>
  );
}
