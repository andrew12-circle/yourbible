import { Loader2, Maximize2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { artifactCard, artifactInset, artifactScrollMt, artifactVideoRadius } from "@/lib/framework/artifactSurfaces";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

type Props = {
  videoSlotRef: React.RefObject<HTMLDivElement | null>;
  pipMode: boolean;
  pipLayout: ArtifactPipLayout;
  thumbnailUrl?: string | null;
  youTubeVideoId: string;
  playerMountRef: React.RefObject<HTMLDivElement | null>;
  playerReady?: boolean;
  playerLoading?: boolean;
  playerInitTimedOut?: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReinitPlayer?: () => void;
  onScrollVideoIntoView: () => void;
  children?: React.ReactNode;
};

export default function ArtifactVideoStage({
  videoSlotRef,
  pipMode,
  pipLayout,
  thumbnailUrl,
  youTubeVideoId,
  playerMountRef,
  playerReady = false,
  playerLoading = false,
  playerInitTimedOut = false,
  isPlaying = false,
  onTogglePlay,
  onReinitPlayer,
  onScrollVideoIntoView,
  children,
}: Props) {
  const thumb = thumbnailUrl || youtubeHqThumbnail(youTubeVideoId);
  const pipHeight = pipTotalHeightPx(pipLayout.width);
  const canToggleInline = !pipMode && playerReady && Boolean(onTogglePlay);
  const showPoster = !playerReady || playerLoading || playerInitTimedOut;
  const showLoading = (playerLoading || playerInitTimedOut) && !playerReady;

  return (
    <section id="video" className={cn(artifactCard, artifactScrollMt, "mb-6 overflow-hidden p-3 sm:p-4 lg:mb-0")}>
      <div
        ref={videoSlotRef}
        className={cn(
          "relative aspect-video w-full shrink-0 overflow-hidden",
          artifactInset,
        )}
      >
        {/* Player host stays in React tree; PiP uses fixed positioning (no appendChild reparent). */}
        <div
          data-youtube-player-shell
          className={cn(
            pipMode
              ? cn(
                  "fixed z-[60]",
                  artifactVideoRadius,
                  "shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
                )
              : "absolute inset-0 z-[2] overflow-hidden rounded-[inherit] bg-black",
            canToggleInline && "cursor-pointer",
          )}
          style={
            pipMode
              ? {
                  left: pipLayout.left,
                  top: pipLayout.top,
                  width: pipLayout.width,
                  height: pipHeight,
                }
              : undefined
          }
          onClick={canToggleInline ? onTogglePlay : undefined}
          onKeyDown={
            canToggleInline
              ? (e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onTogglePlay?.();
                  }
                }
              : undefined
          }
          role={canToggleInline ? "button" : undefined}
          tabIndex={canToggleInline ? 0 : undefined}
          aria-label={canToggleInline ? (isPlaying ? "Pause video" : "Play video") : undefined}
        >
          <div
            className={cn(
              "relative h-full w-full",
              pipMode
                ? cn(artifactVideoRadius, "isolate overflow-hidden bg-black")
                : undefined,
            )}
          >
            <div ref={playerMountRef} className="h-full w-full [&_iframe]:block" />
            {canToggleInline && !isPlaying ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/20"
                aria-hidden
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white">
                  <Play className="h-7 w-7" aria-hidden />
                </span>
              </div>
            ) : null}
            {showLoading ? (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/40 text-white/90"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                <span className="text-xs font-medium">
                  {playerInitTimedOut ? "Video is taking longer than usual…" : "Loading video…"}
                </span>
                {playerInitTimedOut && onReinitPlayer ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-1 h-8 gap-1.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReinitPlayer();
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    Reload video
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {!pipMode ? (
          <img
            src={thumb}
            alt=""
            className={cn(
              "absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-300",
              showPoster ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover blur-md brightness-75"
            />
            <div className="absolute inset-0 bg-background/30" aria-hidden />
            <button
              type="button"
              onClick={onScrollVideoIntoView}
              className="relative z-10 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-background"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              Restore video
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
