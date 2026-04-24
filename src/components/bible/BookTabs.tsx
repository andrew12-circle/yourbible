import { useEffect, useRef } from "react";
import { BOOKS, BibleBook, SECTION_LABELS } from "@/data/books";

interface Props {
  current: BibleBook;
  onSelect: (book: BibleBook) => void;
  /** Which outer edge of the book this strip is rendered on */
  side?: "left" | "right";
}

const SECTION_COLOR: Record<BibleBook["section"], string> = {
  law: "var(--section-law)",
  history: "var(--section-history)",
  poetry: "var(--section-poetry)",
  prophets: "var(--section-prophets)",
  gospels: "var(--section-gospels)",
  acts: "var(--section-acts)",
  epistles: "var(--section-epistles)",
  revelation: "var(--section-revelation)",
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
        style={{ width: 36, [isLeft ? "right" : "left"]: "100%" }}
      >
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-paper to-transparent z-10" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-paper to-transparent z-10" />

        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide select-none"
          style={{ scrollSnapType: "y proximity" }}
        >
          <div style={{ height: "20vh" }} />
          {BOOKS.map((b, i) => {
            const isActive = b.abbr === current.abbr;
            const prevSec = i > 0 ? BOOKS[i - 1].section : null;
            const showLabel = b.section !== prevSec;
            const tone = `hsl(${SECTION_COLOR[b.section]})`;
            const tabHeight = "calc((100vh - 8rem) / 5)";
            return (
              <div key={b.abbr}>
                {showLabel && (
                  <div className="px-1 pt-2 pb-1 text-[7px] uppercase tracking-[0.18em] text-paper/60 text-center font-display">
                    {SECTION_LABELS[b.section].slice(0, 3)}
                  </div>
                )}
                <button
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelect(b)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative block group transition-all duration-300 ${
                    isActive ? "w-full" : "w-[78%] hover:w-[95%]"
                  } ${isLeft ? "ml-auto" : ""}`}
                  style={{
                    height: tabHeight,
                    marginTop: 4,
                    marginBottom: 4,
                    [isLeft ? "marginRight" : "marginLeft"]: -4,
                    scrollSnapAlign: "center",
                  }}
                >
                  <span
                    className="absolute inset-0 block"
                    style={{
                      background: `linear-gradient(180deg, ${tone} 0%, ${tone} 50%, hsl(0 0% 0% / 0.18) 100%), ${tone}`,
                      backgroundBlendMode: "multiply, normal",
                      borderTopLeftRadius: isLeft ? 14 : 0,
                      borderBottomLeftRadius: isLeft ? 14 : 0,
                      borderTopRightRadius: isLeft ? 0 : 14,
                      borderBottomRightRadius: isLeft ? 0 : 14,
                      borderTop: "1px solid hsl(0 0% 100% / 0.25)",
                      [isLeft ? "borderLeft" : "borderRight"]: "1px solid hsl(0 0% 0% / 0.3)",
                      borderBottom: "1px solid hsl(0 0% 0% / 0.25)",
                      boxShadow: isActive
                        ? `inset 1px 1px 0 hsl(0 0% 100% / 0.25), ${isLeft ? "-3px" : "3px"} 2px 8px hsl(0 0% 0% / 0.35)`
                        : `inset 1px 1px 0 hsl(0 0% 100% / 0.15), ${isLeft ? "-1px" : "1px"} 1px 4px hsl(0 0% 0% / 0.22)`,
                      filter: isActive ? "saturate(1.1)" : "saturate(0.9) brightness(0.96)",
                    }}
                  />
                  <span
                    className="absolute top-3 bottom-3 w-px"
                    style={{
                      [isLeft ? "right" : "left"]: 0,
                      backgroundImage:
                        "repeating-linear-gradient(180deg, hsl(0 0% 100% / 0.45) 0 3px, transparent 3px 6px)",
                      opacity: 0.55,
                    }}
                  />
                  <span
                    className={`relative z-10 flex items-center justify-center h-full font-display font-bold tracking-[0.1em] ${
                      isActive ? "text-paper text-[11px]" : "text-paper/85 text-[10px]"
                    }`}
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      textShadow: "0 1px 0 hsl(0 0% 0% / 0.4)",
                    }}
                  >
                    {b.abbr.toUpperCase()}
                  </span>
                </button>
              </div>
            );
          })}
          <div style={{ height: "20vh" }} />
        </div>
      </div>
    </div>
  );
}
