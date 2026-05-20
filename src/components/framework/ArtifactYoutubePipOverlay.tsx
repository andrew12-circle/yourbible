import { createPortal, useCallback } from "react";
import { GripVertical, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

type Props = {
  /** When false, the shell stays in the DOM (for stable reparent) but is hidden off-screen. */
  active: boolean;
  layout: ArtifactPipLayout;
  playerHostRef: React.RefObject<HTMLDivElement | null>;
  onPlayerHostReady?: (host: HTMLDivElement | null) => void;
  onScrollVideoIntoView: () => void;
  onDragHeaderPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHeaderPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHeaderPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onResizePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onResizePointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

/** Fixed mini player portaled to `document.body`; hosts reparented YouTube IFrame API mount. */
export default function ArtifactYoutubePipOverlay({
  active,
  layout,
  playerHostRef,
  onPlayerHostReady,
  onScrollVideoIntoView,
  onDragHeaderPointerDown,
  onDragHeaderPointerMove,
  onDragHeaderPointerUp,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
}: Props) {
  if (typeof document === "undefined") return null;

  const videoH = (layout.width * 9) / 16;

  const setPlayerHostRef = useCallback(
    (node: HTMLDivElement | null) => {
      playerHostRef.current = node;
      onPlayerHostReady?.(node);
    },
    [onPlayerHostReady, playerHostRef],
  );

  return createPortal(
    <div
      className={cn(
        "group fixed z-[60] overflow-hidden rounded-xl bg-black shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15",
        !active && "pointer-events-none invisible h-px w-px overflow-hidden opacity-0",
      )}
      style={
        active
          ? {
              left: layout.left,
              top: layout.top,
              width: layout.width,
              height: pipTotalHeightPx(layout.width),
            }
          : { left: 0, top: 0, width: 1, height: 1 }
      }
      role="region"
      aria-label="Picture-in-picture video"
      aria-hidden={!active}
    >
      <div
        ref={setPlayerHostRef}
        className="relative w-full bg-black"
        style={{ height: active ? videoH : 1 }}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 flex h-9 cursor-grab touch-none select-none items-center justify-between px-1.5 active:cursor-grabbing",
          !active && "hidden",
        )}
        onPointerDown={onDragHeaderPointerDown}
        onPointerMove={onDragHeaderPointerMove}
        onPointerUp={onDragHeaderPointerUp}
        onPointerCancel={onDragHeaderPointerUp}
        aria-hidden
      >
        <GripVertical
          className="h-3.5 w-3.5 shrink-0 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-80"
          aria-hidden
        />
        <button
          type="button"
          onClick={onScrollVideoIntoView}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Restore video to original position"
          className={cn(
            "shrink-0 rounded-full p-1 text-white transition-opacity duration-150",
            "opacity-0 group-hover:opacity-100 hover:bg-white/15",
          )}
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        aria-label="Resize video"
        className={cn(
          "absolute bottom-0 right-0 z-[60] h-7 w-7 cursor-nwse-resize touch-none rounded-tl-md",
          "border border-white/20 bg-black/55 opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 hover:bg-black/75",
          !active && "hidden",
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
