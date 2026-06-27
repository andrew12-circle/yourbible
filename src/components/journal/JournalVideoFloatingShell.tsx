import type { ReactNode } from "react";
import { GripHorizontal } from "lucide-react";
import { useDraggablePanel } from "@/hooks/useDraggablePanel";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  enabled?: boolean;
  className?: string;
  widthClass?: string;
};

/** Draggable floating shell for desktop camera recording over the journal. */
export function JournalVideoFloatingShell({
  children,
  enabled = true,
  className,
  widthClass = "w-[min(420px,calc(100vw-2rem))]",
}: Props) {
  const drag = useDraggablePanel({ enabled });

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "fixed z-[200] overflow-hidden rounded-xl border border-border/60 bg-black shadow-2xl",
        widthClass,
        className,
      )}
      style={{ left: drag.position.x, top: drag.position.y }}
    >
      <div
        className="flex cursor-grab items-center justify-center gap-1 border-b border-white/10 bg-black/80 py-1.5 active:cursor-grabbing"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerUp}
        aria-label="Drag recorder"
      >
        <GripHorizontal className="h-4 w-4 text-white/50" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
          Drag to move
        </span>
      </div>
      {children}
    </div>
  );
}
