import { useMemo } from "react";
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
 * Five thumb-index tabs hooked onto the gilt edge of the open spread.
 * Left edge shows the 5 books just BEFORE the current one (or a window
 * around it when near the start of the canon); right edge shows the 5
 * books just AFTER the current one. Tabs are horizontally staggered so
 * they look like real plastic clip-tabs hooked at slightly different
 * depths along the page block.
 */
const VISIBLE = 5;
/** Horizontal stagger (px outward from the page) — never a perfect ladder */
const STAGGER = [0, 6, 3, 9, 2];

export function BookTabs({ current, onSelect, side = "right" }: Props) {
  const isLeft = side === "left";
  const currentIdx = BOOKS.findIndex((b) => b.abbr === current.abbr);

  // Pick the 5 books visible on this side of the spread.
  // - Left side: the 5 books leading UP TO the current one (current included
  //   when it's near the start so something always shows).
  // - Right side: the 5 books AFTER the current one (current included when
  //   it's near the end).
  const visible: BibleBook[] = useMemo(() => {
    if (isLeft) {
      let end = currentIdx; // exclusive of current → books before
      let start = end - VISIBLE;
      if (start < 0) {
        start = 0;
        end = Math.min(BOOKS.length, VISIBLE);
      }
      return BOOKS.slice(start, end);
    } else {
      let start = currentIdx + 1; // exclusive of current → books after
      let end = start + VISIBLE;
      if (end > BOOKS.length) {
        end = BOOKS.length;
        start = Math.max(0, end - VISIBLE);
      }
      return BOOKS.slice(start, end);
    }
  }, [currentIdx, isLeft]);

  return (
    <div
      className="absolute inset-y-0 pointer-events-none flex flex-col justify-around py-6"
      aria-label={`Book navigation — ${isLeft ? "previous" : "next"} books`}
      style={{
        [isLeft ? "right" : "left"]: 0,
        width: 0,
      }}
    >
      {visible.map((b, i) => {
        const tint = SECTION_TINT[b.section];
        const tintDeep = SECTION_TINT_DEEP[b.section];
        const stagger = STAGGER[i % STAGGER.length];
        const tabWidth = 20;
        const tabHeight = 132;

        return (
          <button
            key={b.abbr}
            onClick={() => onSelect(b)}
            aria-label={`Go to ${SECTION_LABELS[b.section]} — ${b.name}`}
            className="relative pointer-events-auto group transition-transform duration-200 hover:scale-[1.06]"
            style={{
              [isLeft ? "right" : "left"]: -stagger - 6,
              width: tabWidth,
              height: tabHeight,
              alignSelf: isLeft ? "flex-end" : "flex-start",
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
                boxShadow: `inset 0 1px 0 hsl(0 0% 100% / 0.55), ${isLeft ? "-2px" : "2px"} 3px 5px hsl(0 0% 0% / 0.32)`,
              }}
            />
            {/* Outer-edge highlight line */}
            <span
              className="absolute top-1.5 bottom-1.5"
              style={{
                [isLeft ? "left" : "right"]: 1,
                width: 1,
                background:
                  "linear-gradient(180deg, transparent, hsl(0 0% 100% / 0.5), transparent)",
              }}
            />
            {/* Pinhole / clip dot — suggests it's hooked onto the page */}
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
            {/* Vertical full book name */}
            <span
              className="relative z-10 flex items-center justify-center h-full font-display tracking-[0.18em] text-leather/85 text-[9px] font-semibold whitespace-nowrap overflow-hidden px-1"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                textTransform: "uppercase",
              }}
            >
              {b.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
