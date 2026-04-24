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
 * Vertical book index that lives on the right edge.
 * Visually sized to a single tab (active book sits aligned with viewport center).
 * The list scrolls vertically — other tabs come into view as you scroll.
 */
export function BookTabs({ current, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Center the active book in the visible scroll area
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
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 h-[80vh] w-12 sm:w-14 paper-texture border-l border-paper-edge shadow-leather rounded-l-lg flex flex-col"
      aria-label="Book navigation"
    >
      {/* Fades to hint scrollability */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-paper to-transparent z-10 rounded-tl-lg" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-paper to-transparent z-10 rounded-bl-lg" />

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-hide py-[40vh] select-none"
      >
        {BOOKS.map((b, i) => {
          const isActive = b.abbr === current.abbr;
          const prevSec = i > 0 ? BOOKS[i - 1].section : null;
          const showLabel = b.section !== prevSec;
          return (
            <div key={b.abbr}>
              {showLabel && (
                <div className="px-1 pt-2 pb-1 text-[8px] uppercase tracking-widest text-muted-foreground text-center">
                  {SECTION_LABELS[b.section].slice(0, 3)}
                </div>
              )}
              <button
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(b)}
                className={`w-full px-1 py-2 flex items-center gap-1.5 group transition-all ${
                  isActive ? "bg-leather/10 scale-[1.06]" : "hover:bg-leather/5"
                }`}
                style={{ color: `hsl(${SECTION_COLOR[b.section]})` }}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`block w-1 rounded-full transition-all ${
                    isActive ? "h-6" : "h-3 group-hover:h-4"
                  }`}
                  style={{ background: `hsl(${SECTION_COLOR[b.section]})` }}
                />
                <span
                  className={`flex-1 font-sans text-[10px] sm:text-[11px] font-semibold text-center ${
                    isActive ? "text-leather" : ""
                  }`}
                >
                  {b.abbr}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
