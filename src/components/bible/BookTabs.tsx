import { useMemo } from "react";
import { BOOKS, BibleBook, SECTION_LABELS } from "@/data/books";

interface Props {
  current: BibleBook;
  onSelect: (book: BibleBook, anchor?: { x: number; y: number; side: "left" | "right" }) => void;
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
/** Per-tab extra outward stick-out (px) — never a perfect ladder */
const STAGGER = [0, 5, 2, 7, 3];

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
        // The wrapper in BookScene anchors us at the inner edge of the
        // page surface (just inside the gilt). Tabs extend OUTWARD from
        // here, over the gilt and slightly past it.
        [isLeft ? "left" : "right"]: 0,
        width: 0,
      }}
    >
      {visible.map((b, i) => {
        const tint = SECTION_TINT[b.section];
        const tintDeep = SECTION_TINT_DEEP[b.section];
        const stagger = STAGGER[i % STAGGER.length];
        const baseWidth = 28;
        const tabWidth = baseWidth + stagger;
        const tabHeight = 138;

        return (
          <button
            key={b.abbr}
            onClick={(e) => {
              const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              // Anchor point: the tab's outer (visible) edge, vertically centered.
              const x = isLeft ? r.left : r.right;
              const y = r.top + r.height / 2;
              onSelect(b, { x, y, side: isLeft ? "left" : "right" });
            }}
            aria-label={`Go to ${SECTION_LABELS[b.section]} — ${b.name}`}
            className="relative pointer-events-auto group transition-transform duration-200 hover:scale-[1.06]"
            style={{
              // Anchor the tab's INNER edge at the page surface (the
              // wrapper sits there). The tab body extends OUTWARD over
              // the gilt edge, sticking past it like a real thumb-index
              // tab hooked onto the page block.
              [isLeft ? "right" : "left"]: 0,
              [isLeft ? "left" : "right"]: "auto",
              width: tabWidth,
              height: tabHeight,
              alignSelf: isLeft ? "flex-start" : "flex-end",
            }}
          >
            {/* Tab body — outer (visible) edge is rounded, inner (hook)
                edge is squared and tucked under the page so the tab reads
                as physically attached to the page block. */}
            <span
              className="absolute inset-0 block"
              style={{
                backgroundImage: `linear-gradient(${isLeft ? "270deg" : "90deg"}, ${tint} 0%, ${tintDeep} 100%)`,
                // Round only the OUTER edge (the visible thumb-grip side
                // that sticks out past the gilt). The inner edge is flush
                // and squared where it meets / tucks under the page.
                borderTopLeftRadius: isLeft ? 5 : 0,
                borderBottomLeftRadius: isLeft ? 5 : 0,
                borderTopRightRadius: isLeft ? 0 : 5,
                borderBottomRightRadius: isLeft ? 0 : 5,
                border: "1px solid hsl(28 22% 38% / 0.75)",
                // Hide the inner border (the side tucking under the page)
                // so the tab reads as continuous with the page beneath.
                [isLeft ? "borderRight" : "borderLeft"]: "none",
                boxShadow:
                  `inset 0 1px 0 hsl(0 0% 100% / 0.55),` +
                  ` ${isLeft ? "-2px" : "2px"} 2px 4px hsl(0 0% 0% / 0.35)`,
              }}
            />
            {/* Vertical full book name — black ink, larger, clearly legible */}
            <span
              className="relative z-10 flex items-center justify-center h-full font-display tracking-[0.14em] text-[12px] font-bold whitespace-nowrap overflow-hidden px-1"
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                textTransform: "uppercase",
                color: "hsl(0 0% 8%)",
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
