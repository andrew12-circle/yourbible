import { motion, AnimatePresence } from "framer-motion";
import { BibleBook } from "@/data/books";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  book: BibleBook;
  currentChapter?: number;
  onPick: (chapter: number) => void;
  onClose: () => void;
}

/**
 * Inline chapter picker that drops onto the reading page after a book tab is
 * tapped. Looks like a folded leaflet of gold-edged chapter chips.
 */
export function ChapterPicker({ open, book, currentChapter, onPick, onClose }: Props) {
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
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="fixed left-1/2 -translate-x-1/2 top-24 z-50 w-[min(92vw,560px)] paper-texture rounded-xl shadow-leather border border-gold/30 overflow-hidden"
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
            <div className="p-4 max-h-[60vh] overflow-y-auto">
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
