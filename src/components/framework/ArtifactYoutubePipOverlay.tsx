import { createPortal } from "react-dom";
import { GripVertical, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

type Props = {
  active: boolean;
  layout: ArtifactPipLayout;
  onScrollVideoIntoView: () => void;
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
  onScrollVideoIntoView,
  onDragHeaderPointerDown,
  onDragHeaderPointerMove,
  onDragHeaderPointerUp,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
}: Props) {
  if (typeof document === "undefined" || !active) return null;

  return createPortal(
    <div
      className="group pointer-events-none fixed z-[61]"
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
        className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex h-9 cursor-grab touch-none select-none items-center justify-between px-1.5 active:cursor-grabbing"
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
          "pointer-events-auto absolute bottom-0 right-0 z-[60] h-7 w-7 cursor-nwse-resize touch-none rounded-tl-md",
          "border border-white/20 bg-black/55 opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100 hover:bg-black/75",
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
