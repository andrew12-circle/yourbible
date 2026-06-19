import { useCallback, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { useMiniPhone } from "@/contexts/MiniPhoneContext";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mini-phone-bubble-y-pct";
const DEFAULT_Y_PCT = 75;
const DRAG_THRESHOLD = 5;

export function FloatingPhoneBubble() {
  const { toggle, isOpen } = useMiniPhone();

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
      toggle();
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
  }, [toggle]);

  if (isOpen) return null;

  return (
    <button
      type="button"
      data-phone-bubble
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ top: `${yPct}%`, touchAction: "none" }}
      className={cn(
        "fixed right-0 z-[120] flex items-center gap-2 py-4 pl-3.5 pr-2.5 rounded-l-xl shadow-lg transition-shadow duration-200 select-none",
        dragging.current ? "cursor-grabbing" : "cursor-grab",
        isOpen
          ? "bg-muted text-muted-foreground"
          : "bg-success text-success-foreground hover:bg-success/90 hover:shadow-xl",
      )}
      aria-label="Toggle phone"
    >
      <Phone className="h-5 w-5" />
    </button>
  );
}
