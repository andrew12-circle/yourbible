import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { artifactCard, artifactScrollMt, artifactVideoRadius } from "@/lib/framework/artifactSurfaces";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";

type Props = {
  videoSlotRef: React.RefObject<HTMLDivElement | null>;
  pipMode: boolean;
  /** Tablet/desktop: same iframe moves to PiP via CSS (no second player). */
  useStaticPip?: boolean;
  stickyMode?: boolean;
  /** Phone transcript tab: pin under header (flex shrink-0); sticky breaks inside overflow-hidden scroll roots. */
  mobilePinnedHeader?: boolean;
  pipLayout: ArtifactPipLayout;
  thumbnailUrl?: string | null;
  youTubeVideoId: string;
  staticEmbedSrc?: string | null;
  onStaticEmbedLoad?: () => void;
  showApiPlayer?: boolean;
  playerMountRef: React.RefObject<HTMLDivElement | null>;
  playerReady?: boolean;
  playerInitTimedOut?: boolean;
  isPlaying?: boolean;
  playerActivated?: boolean;
  onTogglePlay?: () => void;
  onReinitPlayer?: () => void;
  onScrollVideoIntoView: () => void;
  children?: React.ReactNode;
  /** Fills desktop cinematic hero (no card chrome). */
  variant?: "default" | "hero";
};

export default function ArtifactVideoStage({
  videoSlotRef,
  pipMode,
  useStaticPip = false,
  stickyMode = false,
  mobilePinnedHeader = false,
  pipLayout,
  thumbnailUrl,
  youTubeVideoId,
  staticEmbedSrc = null,
  onStaticEmbedLoad,
  showApiPlayer = false,
  playerMountRef,
  playerReady = false,
  playerInitTimedOut = false,
  isPlaying = false,
  playerActivated = false,
  onTogglePlay,
  onReinitPlayer,
  onScrollVideoIntoView,
  children,
  variant = "default",
}: Props) {
  const heroEmbed = variant === "hero";
  const thumb = thumbnailUrl || youtubeHqThumbnail(youTubeVideoId);
  const pipHeight = pipTotalHeightPx(pipLayout.width);
  const inlineEmbedSrc =
    staticEmbedSrc ?? (youTubeVideoId ? buildYouTubeEmbedSrc(youTubeVideoId) : null);

  const staticPipActive = pipMode && useStaticPip;
  const showStaticIframe = Boolean(inlineEmbedSrc) && !showApiPlayer;
  const apiPipActive = pipMode && showApiPlayer;

  const pipShellStyle = {
    left: pipLayout.left,
    top: pipLayout.top,
    width: pipLayout.width,
    height: pipHeight,
  };

  const pipShellChrome = cn(
    "fixed z-[90] overflow-hidden bg-black",
    artifactVideoRadius,
    "shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
  );

  const showPipLoading =
    apiPipActive && playerActivated && playerInitTimedOut && !playerReady;
  const showPipPauseOverlay =
    apiPipActive && playerActivated && playerReady && !isPlaying && Boolean(onTogglePlay);
  const showPipThumbnail =
    apiPipActive && playerActivated && (showPipLoading || showPipPauseOverlay || playerInitTimedOut);

  /** One static iframe — reposition with CSS on PiP enter/exit (no portal remount). */
  const staticEmbedShell =
    showStaticIframe && inlineEmbedSrc ? (
      <div
        data-youtube-static-shell
        className={staticPipActive ? pipShellChrome : "absolute inset-0 z-[2] overflow-hidden bg-black"}
        style={staticPipActive ? pipShellStyle : undefined}
      >
        <iframe
          data-youtube-static-embed
          key={youTubeVideoId}
          src={inlineEmbedSrc}
          title="YouTube video"
          className="h-full w-full border-0 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={onStaticEmbedLoad}
        />
      </div>
    ) : null;

  /** One API player shell — same element moves inline ↔ PiP (layoutKey only resizes). */
  const apiPlayerShell = showApiPlayer ? (
    <div
      data-youtube-player-shell
      className={cn(
        apiPipActive
          ? pipShellChrome
          : "absolute inset-0 z-[2] overflow-hidden rounded-[inherit] bg-black",
        showPipPauseOverlay && "cursor-pointer",
      )}
      style={apiPipActive ? pipShellStyle : undefined}
      onClick={showPipPauseOverlay ? onTogglePlay : undefined}
    >
      <div className="relative h-full w-full">
        {showPipThumbnail ? (
          <img src={thumb} alt="" className="absolute inset-0 z-[1] h-full w-full object-cover" />
        ) : null}
        <div
          ref={playerMountRef}
          className="relative h-full w-full [&_iframe]:block [&_iframe]:h-full [&_iframe]:w-full"
        />
        {showPipLoading && onReinitPlayer ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/40 text-white/90">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <Button type="button" size="sm" variant="secondary" className="pointer-events-auto" onClick={onReinitPlayer}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Reload video
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  const videoBlock = (
    <div
      ref={heroEmbed ? undefined : videoSlotRef}
      className={cn(
        "relative w-full shrink-0 overflow-hidden bg-black",
        heroEmbed ? "h-full min-h-[inherit]" : cn("aspect-video", artifactVideoRadius),
      )}
      aria-hidden={pipMode ? true : undefined}
    >
      {staticEmbedShell}
      {apiPlayerShell}
    </div>
  );

  if (heroEmbed) {
    return videoBlock;
  }

  if (stickyMode) {
    const pinned = mobilePinnedHeader;
    return (
      <>
        <div
          id="video"
          className={cn(
            "z-[29] w-full shrink-0 bg-black pt-[env(safe-area-inset-top,0px)]",
            pinned ? "relative" : "sticky",
          )}
          style={
            pinned ? undefined : { top: "var(--artifact-header-h, 0px)" }
          }
        >
          {videoBlock}
        </div>
        {children ? (
          <section className={cn(artifactCard, artifactScrollMt, "mb-0 hidden lg:block lg:p-3")}>
            <div className="lg:p-4">{children}</div>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <section
      id="video"
      className={cn(artifactCard, artifactScrollMt, "mb-0 p-3 sm:p-4 lg:mb-0 lg:p-3")}
    >
      <div className="p-3 sm:p-4 lg:p-0">{videoBlock}</div>
      {children ? <div className="p-3 sm:p-4 lg:p-4">{children}</div> : null}
    </section>
  );
}
