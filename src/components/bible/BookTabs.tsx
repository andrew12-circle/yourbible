import { useEffect, useRef } from "react";
import { BOOKS, BibleBook, SECTION_LABELS } from "@/data/books";

interface Props {
  current: BibleBook;
  onSelect: (book: BibleBook) => void;
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
 * Vertical thumb-index tabs that protrude from the right paper stack of the
 * open Bible. Designed to sit INSIDE BookScene, anchored to its right edge.
 * About 5 tabs visible; scroll to reveal more.
 */
export function BookTabs({ current, onSelect }: Props) {
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

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-[4] flex items-stretch pointer-events-none"
      aria-label="Book navigation"
    >
      <div className="relative w-9 sm:w-11 h-full pointer-events-auto">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-paper to-transparent z-10" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-paper to-transparent z-10" />

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
                  <div className="px-1 pt-2 pb-1 text-[8px] uppercase tracking-[0.18em] text-muted-foreground text-center font-display">
                    {SECTION_LABELS[b.section].slice(0, 3)}
                  </div>
                )}
                <button
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelect(b)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative block ml-auto group transition-all duration-300 ${
                    isActive ? "w-full" : "w-[78%] hover:w-[92%]"
                  }`}
                  style={{
                    height: tabHeight,
                    marginTop: 4,
                    marginBottom: 4,
                    scrollSnapAlign: "center",
                  }}
                >
                  <span
                    className="absolute inset-0 block"
                    style={{
                      background: `linear-gradient(180deg, ${tone} 0%, ${tone} 50%, hsl(0 0% 0% / 0.18) 100%), ${tone}`,
                      backgroundBlendMode: "multiply, normal",
                      borderTopLeftRadius: 14,
                      borderBottomLeftRadius: 14,
                      borderTop: "1px solid hsl(0 0% 100% / 0.25)",
                      borderLeft: "1px solid hsl(0 0% 100% / 0.18)",
                      borderBottom: "1px solid hsl(0 0% 0% / 0.25)",
                      boxShadow: isActive
                        ? "inset 1px 1px 0 hsl(0 0% 100% / 0.25), -3px 2px 8px hsl(0 0% 0% / 0.28)"
                        : "inset 1px 1px 0 hsl(0 0% 100% / 0.15), -1px 1px 4px hsl(0 0% 0% / 0.18)",
                      filter: isActive ? "saturate(1.1)" : "saturate(0.9) brightness(0.96)",
                    }}
                  />
                  <span
                    className="absolute left-1.5 top-3 bottom-3 w-px"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(180deg, hsl(0 0% 100% / 0.45) 0 3px, transparent 3px 6px)",
                      opacity: 0.55,
                    }}
                  />
                  <span
                    className={`relative z-10 flex items-center justify-center h-full font-display font-bold tracking-[0.12em] ${
                      isActive ? "text-paper text-[12px]" : "text-paper/85 text-[11px]"
                    }`}
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      textShadow: "0 1px 0 hsl(0 0% 0% / 0.35)",
                    }}
                  >
                    {b.name}
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
