import { useCallback, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hub-sidebar-peek-y-pct";
const DEFAULT_Y_PCT = 88;
const DRAG_THRESHOLD = 5;

export function SidebarPeekTab() {
  const { open, toggleSidebar } = useSidebar();
  const Icon = open ? PanelLeftClose : PanelLeftOpen;

  const [yPct, setYPct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Number(saved) : DEFAULT_Y_PCT;
    } catch {
      return DEFAULT_Y_PCT;
    }
  });

  const dragging = useRef(false);
  const startY = useRef(0);
  const startPct = useRef(yPct);
  const moved = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    startY.current = e.clientY;
    startPct.current = yPct;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [yPct]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > DRAG_THRESHOLD) moved.current = true;
    const vh = window.innerHeight;
    const newPct = Math.min(95, Math.max(5, startPct.current + (dy / vh) * 100));
    setYPct(newPct);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (!moved.current) {
      toggleSidebar();
    } else {
      const vh = window.innerHeight;
      const dy = e.clientY - startY.current;
      const finalPct = Math.min(95, Math.max(5, startPct.current + (dy / vh) * 100));
      setYPct(finalPct);
      try {
        localStorage.setItem(STORAGE_KEY, String(finalPct));
      } catch {
        // ignore
      }
    }
  }, [toggleSidebar]);

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ top: `${yPct}%`, touchAction: "none" }}
      className={cn(
        "fixed left-0 -translate-y-1/2 z-50 flex items-center gap-2 py-4 pl-2.5 pr-3.5 rounded-r-xl shadow-lg transition-shadow duration-200 group select-none",
        dragging.current ? "cursor-grabbing" : "cursor-grab",
        open
          ? "bg-muted text-muted-foreground"
          : "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-xl",
      )}
      aria-label={open ? "Close sidebar" : "Open sidebar"}
    >
      <Icon className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}
