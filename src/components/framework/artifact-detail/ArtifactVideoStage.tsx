import { Maximize2, Play } from "lucide-react";
import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
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
  onScrollVideoIntoView,
  children,
}: Props) {
  const thumb = thumbnailUrl || youtubeHqThumbnail(youTubeVideoId);
  const pipHeight = pipTotalHeightPx(pipLayout.width);
  const [inlineRect, setInlineRect] = useState<PlayerRect | null>(null);

  const measureInline = useCallback(() => {
    if (pipMode) return;
    const el = videoSlotRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    setInlineRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  }, [pipMode, videoSlotRef]);

  useLayoutEffect(() => {
    if (pipMode) return;
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

  const playerShellStyle: React.CSSProperties = pipMode
    ? {
        left: pipLayout.left,
        top: pipLayout.top,
        width: pipLayout.width,
        height: pipHeight,
      }
    : inlineRect
      ? {
          left: inlineRect.left,
          top: inlineRect.top,
          width: inlineRect.width,
          height: inlineRect.height,
        }
      : { left: -9999, top: 0, width: 1, height: 1, visibility: "hidden" };

  const playerPortal =
    typeof document !== "undefined"
      ? createPortal(
          <div
            data-youtube-player-shell
            className={cn(
              "fixed z-[60] overflow-hidden bg-black",
              pipMode && "rounded-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
            )}
            style={playerShellStyle}
          >
            <div ref={playerMountRef} className="h-full w-full" />
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
        {!pipMode ? <div className="absolute inset-0 bg-black" aria-hidden /> : null}

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
            <span className="relative z-10 mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
              <Play className="h-4 w-4" aria-hidden />
            </span>
          </div>
        ) : null}
      </div>
      {playerPortal}
      {children}
    </section>
  );
}
