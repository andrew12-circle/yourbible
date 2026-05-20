import { Loader2, Maximize2, Play } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { artifactCard, artifactInset, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

type PlayerRect = { left: number; top: number; width: number; height: number };

type Props = {
  videoSlotRef: React.RefObject<HTMLDivElement | null>;
  mainScrollRef: RefObject<HTMLDivElement | null>;
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
  onScrollVideoIntoView: () => void;
  children?: React.ReactNode;
};

export default function ArtifactVideoStage({
  videoSlotRef,
  mainScrollRef,
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
  onScrollVideoIntoView,
  children,
}: Props) {
  const thumb = thumbnailUrl || youtubeHqThumbnail(youTubeVideoId);
  const pipHeight = pipTotalHeightPx(pipLayout.width);
  const [inlineRect, setInlineRect] = useState<PlayerRect | null>(null);
  const inlineRectRef = useRef<PlayerRect | null>(null);
  const canToggleInline = !pipMode && playerReady && Boolean(onTogglePlay);
  const showInlinePoster = !pipMode && (!playerReady || playerLoading || playerInitTimedOut);
  const showInlineLoading = !pipMode && (playerLoading || playerInitTimedOut) && !playerReady;

  const measureInline = useCallback(() => {
    if (pipMode) return;
    const el = videoSlotRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    const next = { left: r.left, top: r.top, width: r.width, height: r.height };
    const prev = inlineRectRef.current;
    if (
      prev &&
      Math.abs(prev.left - next.left) < 0.5 &&
      Math.abs(prev.top - next.top) < 0.5 &&
      Math.abs(prev.width - next.width) < 0.5 &&
      Math.abs(prev.height - next.height) < 0.5
    ) {
      return;
    }
    inlineRectRef.current = next;
    setInlineRect(next);
  }, [pipMode, videoSlotRef]);

  useLayoutEffect(() => {
    if (pipMode) {
      inlineRectRef.current = null;
      setInlineRect(null);
      return;
    }
    measureInline();
    const el = videoSlotRef.current;
    const scrollEl = mainScrollRef.current;

    window.addEventListener("resize", measureInline);
    window.addEventListener("scroll", measureInline, true);
    scrollEl?.addEventListener("scroll", measureInline, { passive: true });

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureInline) : null;
    if (el) ro?.observe(el);

    return () => {
      window.removeEventListener("resize", measureInline);
      window.removeEventListener("scroll", measureInline, true);
      scrollEl?.removeEventListener("scroll", measureInline);
      ro?.disconnect();
    };
  }, [pipMode, measureInline, mainScrollRef, videoSlotRef]);

  const effectiveInlineRect = pipMode ? null : inlineRectRef.current ?? inlineRect;

  const playerShellStyle: React.CSSProperties = pipMode
    ? {
        left: pipLayout.left,
        top: pipLayout.top,
        width: pipLayout.width,
        height: pipHeight,
      }
    : effectiveInlineRect
      ? {
          left: effectiveInlineRect.left,
          top: effectiveInlineRect.top,
          width: effectiveInlineRect.width,
          height: effectiveInlineRect.height,
        }
      : {
          left: -10000,
          top: 0,
          width: 640,
          height: 360,
          visibility: "hidden",
          pointerEvents: "none",
        };

  const playerPortal =
    typeof document !== "undefined"
      ? createPortal(
          <div
            data-youtube-player-shell
            className={cn(
              "fixed z-[60] overflow-hidden rounded-xl bg-black",
              pipMode && "shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
              canToggleInline && "cursor-pointer",
              !pipMode && !effectiveInlineRect && "opacity-0",
            )}
            style={playerShellStyle}
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
            aria-hidden={!pipMode && !effectiveInlineRect ? true : undefined}
          >
            <div ref={playerMountRef} className="h-full w-full" />
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
          </div>,
          document.body,
        )
      : null;

  return (
    <section id="video" className={cn(artifactCard, artifactScrollMt, "mb-6 overflow-hidden p-3 sm:p-4 lg:mb-0")}>
      <div
        ref={videoSlotRef}
        className={cn(
          "relative aspect-video w-full shrink-0 overflow-hidden",
          artifactInset,
        )}
      >
        {!pipMode ? (
          <>
            <img
              src={thumb}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                showInlinePoster ? "opacity-100" : "opacity-0",
              )}
            />
            {showInlineLoading ? (
              <div
                className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 bg-black/40 text-white/90"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                <span className="text-xs font-medium">
                  {playerInitTimedOut ? "Video is taking longer than usual…" : "Loading video…"}
                </span>
              </div>
            ) : null}
          </>
        ) : null}

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
      {playerPortal}
      {children}
    </section>
  );
}
