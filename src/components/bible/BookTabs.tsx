import { useEffect, useRef } from "react";
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
export function BookTabs({ current, onSelect, side = "right" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const c = containerRef.current;
      const a = activeRef.current;
      const target = a.offsetTop - c.clientHeight / 2 + a.clientHeight / 2;
      c.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [current.abbr]);

  const isLeft = side === "left";

  return (
    <div className="absolute inset-0 pointer-events-none" aria-label="Book navigation">
      <div
        className="absolute top-0 bottom-0 pointer-events-auto"
        // Tabs sit just inside the page edge and stick out ~16px past it.
        style={{ width: 30, [isLeft ? "right" : "left"]: -16 }}
      >
        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide select-none flex flex-col justify-evenly py-4"
          style={{ scrollSnapType: "y proximity" }}
        >
          {BOOKS.map((b) => {
            const isActive = b.abbr === current.abbr;
            const tint = SECTION_TINT[b.section];
            const tintDeep = SECTION_TINT_DEEP[b.section];
            // Even spacing — let flex distribute, but enforce a tidy min height.
            const tabHeight = isActive ? 36 : 30;
            return (
              <button
                key={b.abbr}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(b)}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Go to ${SECTION_LABELS[b.section]} — ${b.name}`}
                className={`relative block group transition-all duration-200 ${isLeft ? "ml-auto mr-0" : "mr-auto ml-0"}`}
                style={{
                  height: tabHeight,
                  width: isActive ? "100%" : "92%",
                  scrollSnapAlign: "center",
                }}
              >
                {/* Tab body */}
                <span
                  className="absolute inset-0 block"
                  style={{
                    backgroundImage: `linear-gradient(${isLeft ? "270deg" : "90deg"}, ${tint} 0%, ${tintDeep} 100%)`,
                    borderTopLeftRadius: isLeft ? 4 : 2,
                    borderBottomLeftRadius: isLeft ? 4 : 2,
                    borderTopRightRadius: isLeft ? 2 : 4,
                    borderBottomRightRadius: isLeft ? 2 : 4,
                    border: "1px solid hsl(28 22% 60% / 0.55)",
                    [isLeft ? "borderRight" : "borderLeft"]: "1px solid hsl(28 22% 50% / 0.25)",
                    boxShadow: isActive
                      ? `inset 0 1px 0 hsl(0 0% 100% / 0.7), ${isLeft ? "-2px" : "2px"} 2px 5px hsl(0 0% 0% / 0.28)`
                      : `inset 0 1px 0 hsl(0 0% 100% / 0.55), ${isLeft ? "-1px" : "1px"} 1px 3px hsl(0 0% 0% / 0.22)`,
                  }}
                />
                {/* Subtle inner highlight line along outer edge */}
                <span
                  className="absolute top-1 bottom-1"
                  style={{
                    [isLeft ? "left" : "right"]: 1,
                    width: 1,
                    background:
                      "linear-gradient(180deg, transparent, hsl(0 0% 100% / 0.45), transparent)",
                  }}
                />
                {/* Vertical book name */}
                <span
                  className={`relative z-10 flex items-center justify-center h-full font-display tracking-[0.18em] ${
                    isActive ? "text-leather text-[9px] font-semibold" : "text-leather/70 text-[8.5px] font-medium"
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
