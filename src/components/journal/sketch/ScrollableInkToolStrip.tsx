import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  isNightMode: boolean;
  className?: string;
  trayClassName?: string;
  "aria-label"?: string;
  children: ReactNode;
};

export function ScrollableInkToolStrip({
  isNightMode,
  className,
  trayClassName,
  "aria-label": ariaLabel,
  children,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setEdge({
      left: overflow && el.scrollLeft > 2,
      right: overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncEdges();
    const ro = new ResizeObserver(syncEdges);
    ro.observe(el);
    el.addEventListener("scroll", syncEdges, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", syncEdges);
    };
  }, [syncEdges, children]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(100, Math.floor(el.clientWidth * 0.55));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const fadeClass = isNightMode
    ? "bg-gradient-to-r from-[rgba(18,18,22,0.95)] to-transparent"
    : "bg-gradient-to-r from-[rgba(255,255,255,0.95)] to-transparent";

  const chevronClass = cn(
    "absolute top-1/2 z-[2] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border-none shadow-sm transition active:scale-95",
    isNightMode
      ? "bg-white/15 text-white hover:bg-white/25"
      : "bg-white/90 text-neutral-700 hover:bg-white",
  );

  return (
    <div className={cn("relative flex min-w-0 flex-1 items-stretch", className)}>
      {edge.left ? (
        <>
          <div
            className={cn("pointer-events-none absolute left-0 top-0 z-[1] h-full w-7 rounded-l-[18px]", fadeClass)}
            aria-hidden
          />
          <button
            type="button"
            className={cn(chevronClass, "left-0.5")}
            aria-label="Scroll tools left"
            onClick={() => scrollBy(-1)}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </>
      ) : null}

      <div
        ref={scrollerRef}
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "ink-toolbar-scroll flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-proximity rounded-[18px] p-1.5",
          trayClassName,
        )}
      >
        {children}
      </div>

      {edge.right ? (
        <>
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 z-[1] h-full w-7 rounded-r-[18px]",
              fadeClass,
              "bg-gradient-to-l",
            )}
            aria-hidden
          />
          <button
            type="button"
            className={cn(chevronClass, "right-0.5")}
            aria-label="Scroll tools right"
            onClick={() => scrollBy(1)}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
