import { Maximize2, Play } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { artifactCard, artifactInset, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

type Props = {
  videoSlotRef: React.RefObject<HTMLDivElement | null>;
  pipMode: boolean;
  thumbnailUrl?: string | null;
  youTubeVideoId: string;
  playerMountRef: React.RefObject<HTMLDivElement | null>;
  pipPlayerHostRef: React.RefObject<HTMLDivElement | null>;
  onReparentPlayer: (host: HTMLElement | null) => void;
  onScrollVideoIntoView: () => void;
  children?: React.ReactNode;
};

export default function ArtifactVideoStage({
  videoSlotRef,
  pipMode,
  thumbnailUrl,
  youTubeVideoId,
  playerMountRef,
  pipPlayerHostRef,
  onReparentPlayer,
  onScrollVideoIntoView,
  children,
}: Props) {
  const inlineHostRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (pipMode) onReparentPlayer(pipPlayerHostRef.current);
    else onReparentPlayer(inlineHostRef.current);
  }, [pipMode, onReparentPlayer, pipPlayerHostRef]);

  const thumb = thumbnailUrl || youtubeHqThumbnail(youTubeVideoId);

  return (
    <section id="video" className={cn(artifactCard, artifactScrollMt, "mb-6 overflow-hidden p-3 sm:p-4 lg:mb-0")}>
      <div
        ref={videoSlotRef}
        className={cn(
          "relative aspect-video w-full shrink-0 overflow-hidden",
          artifactInset,
        )}
      >
        <div
          ref={inlineHostRef}
          data-inline-player-host
          className={cn(
            "absolute inset-0 h-full w-full",
            pipMode && "pointer-events-none opacity-0",
          )}
        >
          <div ref={playerMountRef} className="h-full w-full" />
        </div>

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
      {children}
    </section>
  );
}
