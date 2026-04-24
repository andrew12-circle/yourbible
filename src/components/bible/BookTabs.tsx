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
 * Physical Bible thumb-index tabs.
 * Each book is a small leathery half-moon protruding from the right edge of
 * the page. The active tab is darker/larger and pulled out further. The strip
 * is scrollable so all books are reachable.
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
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 h-[82vh] flex items-stretch pointer-events-none"
      aria-label="Book navigation"
    >
      {/* Page edge — the cream paper stack the tabs poke out of */}
      <div
        className="w-2 self-stretch pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--paper-edge) / 0) 0%, hsl(var(--paper-edge)) 60%, hsl(var(--paper-deep)) 100%)",
          boxShadow: "inset -1px 0 0 hsl(var(--paper-deep) / 0.5)",
        }}
      />

      {/* Top + bottom fade hints */}
      <div className="relative w-9 sm:w-11 h-full pointer-events-auto">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-background to-transparent z-10" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background to-transparent z-10" />

        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide py-[40vh] select-none"
        >
          {BOOKS.map((b, i) => {
            const isActive = b.abbr === current.abbr;
            const prevSec = i > 0 ? BOOKS[i - 1].section : null;
            const showLabel = b.section !== prevSec;
            const tone = `hsl(${SECTION_COLOR[b.section]})`;
            return (
              <div key={b.abbr}>
                {showLabel && (
                  <div className="px-1 pt-3 pb-1 text-[8px] uppercase tracking-[0.18em] text-muted-foreground text-center font-display">
                    {SECTION_LABELS[b.section].slice(0, 3)}
                  </div>
                )}
                <button
                  ref={isActive ? activeRef : undefined}
                  onClick={() => onSelect(b)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative block my-[3px] ml-auto group transition-all duration-300 ${
                    isActive ? "w-full" : "w-[78%] hover:w-[92%]"
                  }`}
                  style={{
                    height: isActive ? 28 : 22,
                  }}
                >
                  {/* Tab body — half-moon protrusion */}
                  <span
                    className="absolute inset-0 block"
                    style={{
                      background: `linear-gradient(180deg, ${tone} 0%, ${tone} 45%, hsl(0 0% 0% / 0.18) 100%), ${tone}`,
                      backgroundBlendMode: "multiply, normal",
                      borderTopLeftRadius: 9999,
                      borderBottomLeftRadius: 9999,
                      borderTop: "1px solid hsl(0 0% 100% / 0.25)",
                      borderLeft: "1px solid hsl(0 0% 100% / 0.18)",
                      borderBottom: "1px solid hsl(0 0% 0% / 0.25)",
                      boxShadow: isActive
                        ? "inset 1px 1px 0 hsl(0 0% 100% / 0.25), -2px 2px 6px hsl(0 0% 0% / 0.25)"
                        : "inset 1px 1px 0 hsl(0 0% 100% / 0.15), -1px 1px 3px hsl(0 0% 0% / 0.18)",
                      filter: isActive ? "saturate(1.1)" : "saturate(0.9) brightness(0.96)",
                    }}
                  />
                  {/* Stitched edge */}
                  <span
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 h-[60%] w-px"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(180deg, hsl(0 0% 100% / 0.45) 0 2px, transparent 2px 4px)",
                      opacity: 0.6,
                    }}
                  />
                  {/* Label — gold-foil-ish for active, faded ink otherwise */}
                  <span
                    className={`relative z-10 flex items-center justify-center h-full font-display font-bold tracking-wide ${
                      isActive
                        ? "text-paper text-[11px]"
                        : "text-paper/85 text-[10px]"
                    }`}
                    style={{
                      textShadow: "0 1px 0 hsl(0 0% 0% / 0.35)",
                    }}
                  >
                    {b.abbr}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
