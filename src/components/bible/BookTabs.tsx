import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BOOKS, BibleBook, SECTION_LABELS } from "@/data/books";
import { ChevronRight } from "lucide-react";

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

export function BookTabs({ current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<BibleBook | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointer = (clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, y / rect.height));
    const idx = Math.min(BOOKS.length - 1, Math.floor(ratio * BOOKS.length));
    setHovered(BOOKS[idx]);
  };

  // Close panel on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* Edge tab handle */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open book navigation"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 w-7 h-24 rounded-l-md leather-texture shadow-leather border-l border-y border-gold/30 flex items-center justify-center text-gold-bright hover:w-9 transition-all"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[78px] sm:w-[88px] paper-texture border-l border-paper-edge shadow-leather flex flex-col"
            >
              <div
                ref={containerRef}
                className="flex-1 overflow-y-auto scrollbar-hide py-2 select-none touch-pan-y"
                onPointerDown={(e) => { setScrubbing(true); handlePointer(e.clientY); }}
                onPointerMove={(e) => { if (scrubbing) handlePointer(e.clientY); }}
                onPointerUp={() => {
                  if (hovered) onSelect(hovered);
                  setScrubbing(false); setOpen(false); setHovered(null);
                }}
                onPointerCancel={() => { setScrubbing(false); setHovered(null); }}
              >
                {BOOKS.map((b, i) => {
                  const isActive = b.abbr === current.abbr;
                  const prevSec = i > 0 ? BOOKS[i - 1].section : null;
                  const showLabel = b.section !== prevSec;
                  return (
                    <div key={b.abbr}>
                      {showLabel && (
                        <div className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                          {SECTION_LABELS[b.section]}
                        </div>
                      )}
                      <button
                        onClick={() => { onSelect(b); setOpen(false); }}
                        className={`w-full px-2 py-1.5 text-left flex items-center gap-2 group ${isActive ? "scale-[1.04]" : ""}`}
                        style={{ color: `hsl(${SECTION_COLOR[b.section]})` }}
                      >
                        <span
                          className={`block h-3.5 w-1 rounded-full transition-all ${isActive ? "h-5" : "group-hover:h-4"}`}
                          style={{ background: `hsl(${SECTION_COLOR[b.section]})` }}
                        />
                        <span className={`font-sans text-[11px] font-semibold ${isActive ? "text-leather" : ""}`}>
                          {b.abbr}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Scrub preview */}
            <AnimatePresence>
              {hovered && scrubbing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="fixed right-[100px] top-1/2 -translate-y-1/2 z-50 bg-paper border border-gold/40 shadow-leather rounded-lg px-5 py-3 pointer-events-none"
                >
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{SECTION_LABELS[hovered.section]}</div>
                  <div className="font-display text-2xl text-leather">{hovered.name}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
