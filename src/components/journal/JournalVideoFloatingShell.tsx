import type { ReactNode } from "react";
import { GripHorizontal } from "lucide-react";
import { useFloatingPanel } from "@/hooks/useFloatingPanel";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  enabled?: boolean;
  className?: string;
};

/** Draggable, resizable floating shell — opens at centered dialog size. */
export function JournalVideoFloatingShell({ children, enabled = true, className }: Props) {
  const panel = useFloatingPanel({ enabled });

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "fixed z-[200] flex flex-col overflow-hidden rounded-xl border border-border/60 bg-black shadow-2xl",
        className,
      )}
      style={{
        left: panel.rect.x,
        top: panel.rect.y,
        width: panel.rect.width,
        height: panel.rect.height,
      }}
    >
      <div
        className="flex shrink-0 cursor-grab items-center justify-center gap-1 border-b border-white/10 bg-black/80 py-2 active:cursor-grabbing"
        onPointerDown={panel.onDragPointerDown}
        onPointerMove={panel.onDragPointerMove}
        onPointerUp={panel.onDragPointerUp}
        onPointerCancel={panel.onDragPointerUp}
        aria-label="Drag recorder"
      >
        <GripHorizontal className="h-4 w-4 text-white/50" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
          Drag to move · corner to resize
        </span>
      </div>

      <div className="relative min-h-0 flex-1">{children}</div>

      <div
        className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize"
        onPointerDown={panel.onResizePointerDown}
        onPointerMove={panel.onResizePointerMove}
        onPointerUp={panel.onResizePointerUp}
        onPointerCancel={panel.onResizePointerUp}
        aria-label="Resize recorder"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-full w-full text-white/40"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M14 14h-2v-2h2v2zm-4 0H8v-2h2v2zm4-4h-2V8h2v2zM10 6H8V4h2v2z"
          />
        </svg>
      </div>
    </div>
  );
}
