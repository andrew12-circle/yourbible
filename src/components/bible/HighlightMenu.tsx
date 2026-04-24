import { motion, AnimatePresence } from "framer-motion";
import { getPalette } from "@/lib/bible/palettes";
import { Trash2, NotebookPen } from "lucide-react";

interface Props {
  open: boolean;
  paletteId: string;
  currentColor?: string | null;
  x: number; y: number;
  onPick: (cssVar: string) => void;
  onClear: () => void;
  onNote: () => void;
  onClose: () => void;
}

export function HighlightMenu({ open, paletteId, currentColor, x, y, onPick, onClear, onNote, onClose }: Props) {
  const palette = getPalette(paletteId);
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 bg-paper border border-gold/40 rounded-full shadow-leather px-3 py-2 flex items-center gap-1.5"
            style={{ left: Math.max(8, Math.min(x - 100, window.innerWidth - 220)), top: Math.max(8, y - 56) }}
          >
            {palette.colors.map(c => (
              <button
                key={c.cssVar}
                onClick={() => onPick(c.cssVar)}
                title={`${c.name}${c.meaning ? ` · ${c.meaning}` : ""}`}
                className={`w-7 h-7 rounded-full border-2 transition-all ${currentColor === c.cssVar ? "border-leather scale-110" : "border-paper hover:scale-105"}`}
                style={{ background: `hsl(var(${c.cssVar}))` }}
              />
            ))}
            <div className="w-px h-5 bg-paper-edge mx-1" />
            <button onClick={onNote} className="w-8 h-8 rounded-full hover:bg-paper-warm flex items-center justify-center text-leather" title="Add note">
              <NotebookPen className="w-4 h-4" />
            </button>
            {currentColor && (
              <button onClick={onClear} className="w-8 h-8 rounded-full hover:bg-paper-warm flex items-center justify-center text-destructive" title="Remove highlight">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
