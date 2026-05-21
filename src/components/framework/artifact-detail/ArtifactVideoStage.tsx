import { createPortal } from "react-dom";
import { Loader2, Maximize2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { artifactCard, artifactInset, artifactScrollMt, artifactVideoRadius } from "@/lib/framework/artifactSurfaces";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

type Props = {
  videoSlotRef: React.RefObject<HTMLDivElement | null>;
  pipMode: boolean;
  stickyMode?: boolean;
  pipLayout: ArtifactPipLayout;
  thumbnailUrl?: string | null;
  youTubeVideoId: string;
  playerMountRef: React.RefObject<HTMLDivElement | null>;
  playerReady?: boolean;
  playerLoading?: boolean;
  playerInitTimedOut?: boolean;
  isPlaying?: boolean;
  playerActivated?: boolean;
  onActivateAndPlay?: () => void;
  onTogglePlay?: () => void;
  onReinitPlayer?: () => void;
  onScrollVideoIntoView: () => void;
  children?: React.ReactNode;
};

export default function ArtifactVideoStage({
  videoSlotRef,
  pipMode,
  stickyMode = false,
  pipLayout,
  thumbnailUrl,
  youTubeVideoId,
  playerMountRef,
  playerReady = false,
  playerLoading = false,
  playerInitTimedOut = false,
  isPlaying = false,
  playerActivated = false,
  onActivateAndPlay,
  onTogglePlay,
  onReinitPlayer,
  onScrollVideoIntoView,
  children,
}: Props) {
  const thumb = thumbnailUrl || youtubeHqThumbnail(youTubeVideoId);
  const pipHeight = pipTotalHeightPx(pipLayout.width);
  const canToggleInline = !pipMode && playerActivated && playerReady && Boolean(onTogglePlay);
  const showPoster =
    !playerActivated || !playerReady || playerLoading || playerInitTimedOut;
  const showLoading =
    playerActivated && (playerLoading || playerInitTimedOut) && !playerReady;
  const showPosterPlay = !pipMode && !playerActivated && Boolean(onActivateAndPlay);

  const playerShell = (
    <div
      data-youtube-player-shell
      className={cn(
        pipMode
          ? cn(
              "fixed z-[60]",
              artifactVideoRadius,
              "shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
            )
          : cn(
              "absolute inset-0 z-[2] overflow-hidden rounded-[inherit]",
              showPoster ? "bg-transparent" : "bg-black",
            ),
        (canToggleInline || showPosterPlay) && "cursor-pointer",
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
      onClick={
        showPosterPlay
          ? (e) => {
              e.stopPropagation();
              onActivateAndPlay?.();
            }
          : canToggleInline
            ? onTogglePlay
            : undefined
      }
      onKeyDown={
        showPosterPlay || canToggleInline
          ? (e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (showPosterPlay) onActivateAndPlay?.();
                else onTogglePlay?.();
              }
            }
          : undefined
      }
      role={showPosterPlay || canToggleInline ? "button" : undefined}
      tabIndex={showPosterPlay || canToggleInline ? 0 : undefined}
      aria-label={
        showPosterPlay
          ? "Load and play video"
          : canToggleInline
            ? isPlaying
              ? "Pause video"
              : "Play video"
            : undefined
      }
    >
      <div
        className={cn(
          "relative h-full w-full",
          pipMode ? cn(artifactVideoRadius, "isolate overflow-hidden bg-black") : undefined,
          !playerActivated && !pipMode && "invisible",
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
  );

  const portaledPlayerShell =
    pipMode && typeof document !== "undefined"
      ? createPortal(playerShell, document.body)
      : playerShell;

  const videoBlock = (
    <div
      ref={videoSlotRef}
      className={cn(
        "relative aspect-video w-full shrink-0",
        pipMode ? "overflow-visible" : "overflow-hidden",
        artifactInset,
      )}
    >
      {portaledPlayerShell}

      {!pipMode ? (
        <>
          <img
            src={thumb}
            alt=""
            className={cn(
              "absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-300",
              showPoster ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          />
          {showPosterPlay ? (
            <button
              type="button"
              className="absolute inset-0 z-[3] flex items-center justify-center bg-black/25 transition hover:bg-black/35"
              aria-label="Load and play video"
              onClick={(e) => {
                e.stopPropagation();
                onActivateAndPlay?.();
              }}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-2 ring-white/20">
                <Play className="h-8 w-8 ml-0.5" aria-hidden />
              </span>
            </button>
          ) : null}
        </>
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
  );

  if (stickyMode) {
    // Sticky must not sit inside a short wrapper (only video height) or it scrolls away with that box.
    return (
      <>
        <div
          id="video"
          className={cn(
            "sticky z-[29] w-full shrink-0 bg-background shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/95",
          )}
          style={{ top: "var(--artifact-header-h, 0px)" }}
        >
          {videoBlock}
        </div>
        {children ? (
          <section
            className={cn(
              artifactCard,
              artifactScrollMt,
              "mb-0 hidden overflow-hidden p-3 sm:p-4 lg:mb-0 lg:block lg:p-3",
            )}
          >
            <div className="lg:p-4">{children}</div>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <section
      id="video"
      className={cn(
        artifactCard,
        artifactScrollMt,
        "mb-0 p-3 sm:p-4 lg:mb-0 lg:p-3",
        pipMode ? "overflow-visible" : "overflow-hidden",
      )}
    >
      <div className="p-3 sm:p-4 lg:p-0">{videoBlock}</div>
      {children ? <div className="p-3 sm:p-4 lg:p-4">{children}</div> : null}
    </section>
  );
}
