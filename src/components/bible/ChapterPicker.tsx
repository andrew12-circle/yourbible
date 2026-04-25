import { motion, AnimatePresence } from "framer-motion";
import { BibleBook } from "@/data/books";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  book: BibleBook;
  currentChapter?: number;
  /** Where to anchor the popover. If omitted, falls back to top-center. */
  anchor?: { x: number; y: number; side: "left" | "right" };
  onPick: (chapter: number) => void;
  onClose: () => void;
}

/**
 * Inline chapter picker that drops onto the reading page after a book tab is
 * tapped. Looks like a folded leaflet of gold-edged chapter chips.
 */
export function ChapterPicker({ open, book, currentChapter, anchor, onPick, onClose }: Props) {
  // Width is responsive — narrower than 92vw so it can sit beside the tab.
  const PANEL_W = Math.min(360, typeof window !== "undefined" ? Math.round(window.innerWidth * 0.86) : 360);

  // Compute panel position relative to the anchor (tab edge).
  // Falls back to a centered overlay if no anchor.
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      if (!anchor) {
        setPanelStyle({
          left: "50%",
          top: 96,
          transform: "translateX(-50%)",
          width: `min(92vw, 560px)`,
        });
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;
      const gap = 12;
      // Estimate panel height — clamps to viewport via maxHeight on the inner div.
      const estH = Math.min(vh - 2 * margin, 440);
      let left: number;
      if (anchor.side === "right") {
        // Tab is on the right edge → panel opens to the LEFT of the tab.
        left = anchor.x - gap - PANEL_W;
        if (left < margin) left = Math.max(margin, anchor.x - PANEL_W - gap);
        if (left < margin) left = margin;
      } else {
        // Tab is on the left edge → panel opens to the RIGHT of the tab.
        left = anchor.x + gap;
        if (left + PANEL_W > vw - margin) left = vw - margin - PANEL_W;
        if (left < margin) left = margin;
      }
      let top = anchor.y - estH / 2;
      if (top + estH > vh - margin) top = vh - margin - estH;
      if (top < margin) top = margin;
      setPanelStyle({ left, top, width: PANEL_W });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open, anchor, PANEL_W]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-leather-deep/30 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{
              opacity: 0,
              x: anchor?.side === "right" ? 14 : anchor?.side === "left" ? -14 : 0,
              scale: 0.97,
            }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{
              opacity: 0,
              x: anchor?.side === "right" ? 10 : anchor?.side === "left" ? -10 : 0,
              scale: 0.97,
            }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            style={panelStyle}
            className="fixed z-50 paper-texture rounded-xl shadow-leather border border-gold/30 overflow-hidden flex flex-col max-h-[88vh]"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-paper-edge bg-gradient-to-b from-paper-warm to-paper">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Choose chapter</div>
                <div className="font-display text-2xl text-leather leading-tight">{book.name}</div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-muted-foreground hover:text-leather transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
                {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => {
                  const isCurrent = c === currentChapter;
                  return (
                    <button
                      key={c}
                      onClick={() => onPick(c)}
                      className={`h-11 rounded-md font-display text-base transition-all border ${
                        isCurrent
                          ? "bg-leather text-paper border-leather-deep shadow-soft scale-105"
                          : "bg-paper border-paper-edge text-leather hover:bg-gold/15 hover:border-gold/40"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
