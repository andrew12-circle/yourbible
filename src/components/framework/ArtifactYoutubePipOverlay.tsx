import { createPortal } from "react-dom";
import { GripVertical, Maximize2 } from "lucide-react";
import { pipTotalHeightPx, type ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";

type Props = {
  embedSrc: string;
  youTubeVideoId: string;
  layout: ArtifactPipLayout;
  onScrollVideoIntoView: () => void;
  onDragHeaderPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHeaderPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHeaderPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onResizePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onResizePointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
};

/** Fixed mini player portaled to `document.body` so it is not clipped by scroll containers. */
export default function ArtifactYoutubePipOverlay({
  embedSrc,
  youTubeVideoId,
  layout,
  onScrollVideoIntoView,
  onDragHeaderPointerDown,
  onDragHeaderPointerMove,
  onDragHeaderPointerUp,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
}: Props) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed relative z-[60] flex flex-col overflow-hidden rounded-xl bg-black shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: pipTotalHeightPx(layout.width),
      }}
      role="region"
      aria-label="Picture-in-picture video"
    >
      <div
        className="flex h-7 shrink-0 cursor-grab touch-none select-none items-center gap-1.5 bg-black/85 pl-2 pr-1 text-white/90 active:cursor-grabbing"
        onPointerDown={onDragHeaderPointerDown}
        onPointerMove={onDragHeaderPointerMove}
        onPointerUp={onDragHeaderPointerUp}
        onPointerCancel={onDragHeaderPointerUp}
      >
        <GripVertical className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        <span className="flex-1 truncate text-[10px] font-medium uppercase tracking-wider text-white/75">
          Drag to move
        </span>
        <button
          type="button"
          onClick={onScrollVideoIntoView}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Restore video to original position"
          className="shrink-0 rounded-full bg-black/70 p-1 text-white shadow hover:bg-black/90"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        className="relative w-full shrink-0 bg-black"
        style={{ height: (layout.width * 9) / 16 }}
      >
        <iframe
          key={`pip-${youTubeVideoId}`}
          title="YouTube video (picture-in-picture)"
          src={embedSrc}
          className="h-full w-full border-0"
          allow={IFRAME_ALLOW}
          allowFullScreen
        />
      </div>
      <button
        type="button"
        aria-label="Resize video"
        className="absolute bottom-0 right-0 z-[60] h-7 w-7 cursor-nwse-resize touch-none rounded-tl-md border border-white/20 bg-black/55 hover:bg-black/75"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
      />
    </div>,
    document.body,
  );
}
