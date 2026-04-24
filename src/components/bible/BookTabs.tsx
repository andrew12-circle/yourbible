import { useEffect, useMemo, useRef } from "react";
import { BOOKS, BibleBook, SECTION_LABELS } from "@/data/books";

interface Props {
  current: BibleBook;
  onSelect: (book: BibleBook) => void;
  /** Which outer edge of the book this strip is rendered on */
  side?: "left" | "right";
}

/** Very subtle warm tints per section — all in cream/blush range, never neon. */
const SECTION_TINT: Record<BibleBook["section"], string> = {
  law:        "hsl(28 32% 88%)",
  history:    "hsl(22 30% 87%)",
  poetry:     "hsl(18 35% 89%)",
  prophets:   "hsl(30 28% 86%)",
  gospels:    "hsl(20 38% 90%)",
  acts:       "hsl(24 32% 88%)",
  epistles:   "hsl(28 30% 89%)",
  revelation: "hsl(16 36% 87%)",
};
const SECTION_TINT_DEEP: Record<BibleBook["section"], string> = {
  law:        "hsl(28 28% 78%)",
  history:    "hsl(22 26% 76%)",
  poetry:     "hsl(18 30% 79%)",
  prophets:   "hsl(30 24% 76%)",
  gospels:    "hsl(20 32% 80%)",
  acts:       "hsl(24 28% 78%)",
  epistles:   "hsl(28 26% 79%)",
  revelation: "hsl(16 30% 77%)",
};

/**
 * Vertical thumb-index tabs cut into the page-stack on the outer edge.
 * - On the right edge (recto), tabs poke OUT to the right.
 * - On the left edge (verso), tabs poke OUT to the left (mirrored).
 */
/** How many tabs are visible at once on each side */
const VISIBLE = 5;
/** Horizontal stagger pattern (px outward from the page) — never a perfect ladder */
const STAGGER = [0, 6, 3, 9, 2, 7];

export function BookTabs({ current, onSelect, side = "right" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const isLeft = side === "left";

  // Show every book in the canon on each side, but the strip only displays
  // ~5 at a time. We center the viewport on the current book.
  const items = useMemo(() => BOOKS, []);
  const currentIdx = items.findIndex((b) => b.abbr === current.abbr);

  // Compute slot height from the container so exactly 5 tabs fit.
  // We do this in a layout effect to react to resizes.
  const SLOT_H_DEFAULT = 84;
  const slotHRef = useRef(SLOT_H_DEFAULT);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const update = () => {
      const h = c.clientHeight;
      slotHRef.current = Math.max(60, Math.floor(h / VISIBLE));
      // Re-center on active after resize.
      if (activeRef.current) {
        const a = activeRef.current;
        c.scrollTo({ top: a.offsetTop - h / 2 + a.clientHeight / 2 });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    const a = activeRef.current;
    if (!c || !a) return;
    const target = a.offsetTop - c.clientHeight / 2 + a.clientHeight / 2;
    c.scrollTo({ top: target, behavior: "smooth" });
  }, [current.abbr]);

  return (
    <div
      className="absolute inset-y-0 pointer-events-none"
      aria-label="Book navigation"
      // Push the tab strip OUT past the gilt edge so tabs hang off the page.
      style={{
        [isLeft ? "right" : "left"]: 0,
        // The strip itself is 0-width; tabs render absolutely inside each slot.
        width: 0,
      }}
    >
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide pointer-events-auto"
        style={{
          // Strip has zero footprint inside the page; tab buttons overflow outward.
          width: 1,
          [isLeft ? "marginRight" : "marginLeft"]: 0,
          scrollSnapType: "y proximity",
        }}
      >
        {items.map((b, i) => {
          const isActive = b.abbr === current.abbr;
          const tint = SECTION_TINT[b.section];
          const tintDeep = SECTION_TINT_DEEP[b.section];
          const distance = Math.abs(i - currentIdx);
          // Subtle fade on tabs far from current
          const fade = distance > VISIBLE * 2 ? 0.55 : distance > VISIBLE ? 0.8 : 1;
          const stagger = STAGGER[i % STAGGER.length];
          const tabWidth = isActive ? 30 : 26;
          const tabHeight = isActive ? 70 : 60;

          return (
            <div
              key={b.abbr}
              className="relative w-full"
              style={{
                height: slotHRef.current,
                scrollSnapAlign: "center",
              }}
            >
              <button
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(b)}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Go to ${SECTION_LABELS[b.section]} — ${b.name}`}
                className="absolute top-1/2 -translate-y-1/2 group transition-all duration-200"
                style={{
                  // Hang OUT past the page edge by stagger amount.
                  [isLeft ? "right" : "left"]: -stagger - 4,
                  width: tabWidth,
                  height: tabHeight,
                  opacity: fade,
                }}
              >
                {/* Tab body */}
                <span
                  className="absolute inset-0 block"
                  style={{
                    backgroundImage: `linear-gradient(${isLeft ? "270deg" : "90deg"}, ${tint} 0%, ${tintDeep} 100%)`,
                    borderTopLeftRadius: isLeft ? 6 : 2,
                    borderBottomLeftRadius: isLeft ? 6 : 2,
                    borderTopRightRadius: isLeft ? 2 : 6,
                    borderBottomRightRadius: isLeft ? 2 : 6,
                    border: "1px solid hsl(28 22% 55% / 0.65)",
                    [isLeft ? "borderRight" : "borderLeft"]:
                      "1px solid hsl(28 22% 45% / 0.25)",
                    boxShadow: isActive
                      ? `inset 0 1px 0 hsl(0 0% 100% / 0.75), ${isLeft ? "-3px" : "3px"} 3px 7px hsl(0 0% 0% / 0.35)`
                      : `inset 0 1px 0 hsl(0 0% 100% / 0.55), ${isLeft ? "-1px" : "1px"} 2px 4px hsl(0 0% 0% / 0.28)`,
                  }}
                />
                {/* Soft inner highlight line along the outer edge */}
                <span
                  className="absolute top-1.5 bottom-1.5"
                  style={{
                    [isLeft ? "left" : "right"]: 1,
                    width: 1,
                    background:
                      "linear-gradient(180deg, transparent, hsl(0 0% 100% / 0.5), transparent)",
                  }}
                />
                {/* Pinhole / clip dot suggesting it's hooked onto the page */}
                <span
                  className="absolute"
                  style={{
                    [isLeft ? "right" : "left"]: 3,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 3,
                    borderRadius: 999,
                    background: "hsl(28 22% 35% / 0.55)",
                    boxShadow: "inset 0 0 0 0.5px hsl(0 0% 100% / 0.35)",
                  }}
                />
                {/* Vertical book name */}
                <span
                  className={`relative z-10 flex items-center justify-center h-full font-display tracking-[0.2em] ${
                    isActive
                      ? "text-leather text-[9px] font-semibold"
                      : "text-leather/70 text-[8.5px] font-medium"
                  }`}
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    textTransform: "uppercase",
                  }}
                >
                  {b.abbr.toUpperCase()}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
