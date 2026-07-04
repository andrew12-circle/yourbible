import { createPortal } from "react-dom";
import { GripVertical, Maximize2, Pause, PictureInPicture2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { artifactVideoRadius } from "@/lib/framework/artifactSurfaces";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

type Props = {
  active: boolean;
  layout: ArtifactPipLayout;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onScrollVideoIntoView: () => void;
  documentPipSupported?: boolean;
  documentPipActive?: boolean;
  onEnterDocumentPip?: () => void;
  onExitDocumentPip?: () => void;
  onDragHeaderPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHeaderPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHeaderPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onResizePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onResizePointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

/** PiP drag/resize chrome portaled over the fixed player (player stays in React tree). */
export default function ArtifactYoutubePipOverlay({
  active,
  layout,
  isPlaying,
  onTogglePlay,
  onScrollVideoIntoView,
  documentPipSupported = false,
  documentPipActive = false,
  onEnterDocumentPip,
  onExitDocumentPip,
  onDragHeaderPointerDown,
  onDragHeaderPointerMove,
  onDragHeaderPointerUp,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
}: Props) {
  if (typeof document === "undefined" || !active) return null;

  const handleRestore = () => {
    if (documentPipActive) onExitDocumentPip?.();
    onScrollVideoIntoView();
  };

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed z-[91] overflow-hidden",
        artifactVideoRadius,
      )}
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: pipTotalHeightPx(layout.width),
      }}
      role="region"
      aria-label="Picture-in-picture controls"
    >
      <div
        className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex h-8 cursor-grab touch-none select-none items-center rounded-t-xl bg-gradient-to-b from-black/70 to-transparent px-2 active:cursor-grabbing"
        onPointerDown={onDragHeaderPointerDown}
        onPointerMove={onDragHeaderPointerMove}
        onPointerUp={onDragHeaderPointerUp}
        onPointerCancel={onDragHeaderPointerUp}
        aria-label="Drag picture-in-picture"
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/90" aria-hidden />
      </div>

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-1 bg-black/65 px-2 py-1.5">
        <button
          type="button"
          onClick={onTogglePlay}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="rounded-full p-1 text-white hover:bg-white/15"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
        </button>
        <div className="flex items-center gap-0.5">
          {documentPipSupported && !documentPipActive && onEnterDocumentPip ? (
            <button
              type="button"
              onClick={onEnterDocumentPip}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Desktop PiP — keep watching while you work"
              title="Desktop PiP"
              className="rounded-full p-1 text-white hover:bg-white/15"
            >
              <PictureInPicture2 className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleRestore}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Restore video to original position"
            className="rounded-full p-1 text-white hover:bg-white/15"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <button
        type="button"
        aria-label="Resize video"
        className={cn(
          "pointer-events-auto absolute bottom-0 right-0 z-[60] h-7 w-7 cursor-nwse-resize touch-none rounded-tl-md",
          "border border-white/25 bg-black/60 hover:bg-black/80",
        )}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
      />
    </div>,
    document.body,
  );
}
