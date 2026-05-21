import { createPortal } from "react-dom";
import { Loader2, Maximize2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { artifactCard, artifactInset, artifactScrollMt, artifactVideoRadius } from "@/lib/framework/artifactSurfaces";
import {
  pipTotalHeightPx,
  type ArtifactPipLayout,
  type ArtifactPlayerShellRect,
} from "@/lib/framework/artifactYoutubePip";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

type Props = {
  videoSlotRef: React.RefObject<HTMLDivElement | null>;
  pipMode: boolean;
  detachPlayerShell?: boolean;
  inlineShellRect?: ArtifactPlayerShellRect | null;
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
  onTogglePlay?: () => void;
  onReinitPlayer?: () => void;
  onScrollVideoIntoView: () => void;
  children?: React.ReactNode;
};

export default function ArtifactVideoStage({
  videoSlotRef,
  pipMode,
  detachPlayerShell = false,
  inlineShellRect = null,
  stickyMode = false,
  pipLayout,
  thumbnailUrl,
  youTubeVideoId,
  playerMountRef,
  playerReady = false,
  playerLoading: _playerLoading = false,
  playerInitTimedOut = false,
  isPlaying = false,
  playerActivated = false,
  onTogglePlay,
  onReinitPlayer,
  onScrollVideoIntoView,
  children,
}: Props) {
  const thumb = thumbnailUrl || youtubeHqThumbnail(youTubeVideoId);
  const pipHeight = pipTotalHeightPx(pipLayout.width);
  const showPipLoading =
    pipMode && playerActivated && playerInitTimedOut && !playerReady;
  const showPipPauseOverlay =
    pipMode && playerActivated && playerReady && !isPlaying && Boolean(onTogglePlay);
  const showPipThumbnail =
    pipMode && playerActivated && (showPipLoading || showPipPauseOverlay || playerInitTimedOut);

  /** PiP-capable: one portaled shell; inline/PiP handoff is CSS-only (no remount). */
  const usePortal = detachPlayerShell && typeof document !== "undefined";
  const inlineReady =
    inlineShellRect != null && inlineShellRect.width >= 8 && inlineShellRect.height >= 8;
  const showPortaledPlayer = usePortal && (pipMode || inlineReady);
  const showPlayerInSlot = !usePortal || (usePortal && !showPortaledPlayer);

  const fixedShellStyle = pipMode
    ? {
        left: pipLayout.left,
        top: pipLayout.top,
        width: pipLayout.width,
        height: pipHeight,
      }
    : inlineShellRect
      ? {
          left: inlineShellRect.left,
          top: inlineShellRect.top,
          width: inlineShellRect.width,
          height: inlineShellRect.height,
        }
      : undefined;

  const playerShell = (
    <div
      data-youtube-player-shell
      className={cn(
        showPortaledPlayer
          ? cn(
              "fixed z-[80]",
              artifactVideoRadius,
              pipMode
                ? "shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
                : "overflow-hidden shadow-sm ring-1 ring-black/10",
            )
          : "absolute inset-0 z-[2] overflow-hidden rounded-[inherit] bg-black",
        showPipPauseOverlay && "cursor-pointer",
      )}
      style={showPortaledPlayer ? fixedShellStyle : undefined}
      onClick={showPipPauseOverlay ? onTogglePlay : undefined}
      onKeyDown={
        showPipPauseOverlay
          ? (e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onTogglePlay?.();
              }
            }
          : undefined
      }
      role={showPipPauseOverlay ? "button" : undefined}
      tabIndex={showPipPauseOverlay ? 0 : undefined}
      aria-label={showPipPauseOverlay ? "Play video" : undefined}
    >
      <div
        className={cn(
          "relative h-full w-full",
          showPortaledPlayer && cn(artifactVideoRadius, "isolate overflow-hidden bg-black"),
        )}
      >
        {showPipThumbnail ? (
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 z-[1] h-full w-full object-cover"
          />
        ) : null}
        <div
          ref={playerMountRef}
          className={cn(
            "relative h-full w-full [&_iframe]:block [&_iframe]:h-full [&_iframe]:w-full",
            showPipThumbnail && playerReady && "invisible",
          )}
        />
        {showPipPauseOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25"
            aria-hidden
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-2 ring-white/20">
              <Play className="h-6 w-6 ml-0.5" aria-hidden />
            </span>
          </div>
        ) : null}
        {showPipLoading && onReinitPlayer ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/40 text-white/90"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <span className="text-xs font-medium">Video is taking longer than usual…</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="pointer-events-auto mt-1 h-8 gap-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onReinitPlayer();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Reload video
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );

  const portaledPlayerShell =
    showPortaledPlayer && usePortal ? createPortal(playerShell, document.body) : null;

  const videoBlock = (
    <div
      ref={videoSlotRef}
      className={cn(
        "relative aspect-video w-full shrink-0 bg-black",
        pipMode || usePortal ? "overflow-visible" : "overflow-hidden",
        artifactInset,
      )}
    >
      {showPortaledPlayer ? portaledPlayerShell : null}
      {showPlayerInSlot ? playerShell : null}

      {pipMode ? (
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
      ) : null}
    </div>
  );

  if (stickyMode) {
    return (
      <>
        <div
          id="video"
          className={cn(
            "sticky z-[29] w-full shrink-0 bg-background shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/95",
          )}
          style={{
            top: "calc(var(--artifact-header-h, 0px) + env(safe-area-inset-top, 0px))",
          }}
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
        pipMode || usePortal ? "overflow-visible" : "overflow-hidden",
      )}
    >
      <div className="p-3 sm:p-4 lg:p-0">{videoBlock}</div>
      {children ? <div className="p-3 sm:p-4 lg:p-4">{children}</div> : null}
    </section>
  );
}
