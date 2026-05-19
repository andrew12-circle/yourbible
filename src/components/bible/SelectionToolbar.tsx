import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getPalette } from "@/lib/bible/palettes";
import type { VerseRange } from "@/lib/bible/verseSelection";
import { Trash2, NotebookPen, PenLine, Network, BookOpenText } from "lucide-react";

export type ToolbarSelection = {
  /** Bounding rect of the current text selection in viewport coords. */
  rect: { left: number; top: number; right: number; bottom: number };
  /** Verse numbers covered by the selection (inclusive). */
  verses: number[];
  /** Character ranges per verse for partial highlights. */
  ranges: VerseRange[];
};

interface Props {
  open: boolean;
  paletteId: string;
  selection: ToolbarSelection | null;
  /** Currently applied color/kind on the *first* verse of the selection (so we
   *  can show the selected swatch). */
  currentColor?: string | null;
  activeColor?: string | null;
  currentlyUnderlined?: boolean;
  onPickHighlight: (cssVar: string) => void;
  onActiveColorChange?: (cssVar: string) => void;
  onPickUnderline: () => void;
  onClear: () => void;
  onNote: () => void;
  onTestFramework?: () => void;
  onOpenCompanion?: () => void;
  onClose: () => void;
}

export function SelectionToolbar({
  open,
  paletteId,
  selection,
  currentColor,
  activeColor,
  currentlyUnderlined,
  onPickHighlight,
  onActiveColorChange,
  onPickUnderline,
  onClear,
  onNote,
  onTestFramework,
  onOpenCompanion,
  onClose,
}: Props) {
  const palette = getPalette(paletteId);

  if (!selection) return null;

  // Position the toolbar centered above the selection. Clamp inside viewport.
  const TOOLBAR_W = 320;
  const margin = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const cx = (selection.rect.left + selection.rect.right) / 2;
  let left = Math.round(cx - TOOLBAR_W / 2);
  if (left < margin) left = margin;
  if (left + TOOLBAR_W > vw - margin) left = vw - margin - TOOLBAR_W;
  // Try above the selection first.
  let top = Math.round(selection.rect.top - 12 - 56);
  if (top < margin) {
    // Not enough room above — place below.
    top = Math.round(selection.rect.bottom + 12);
  }
  if (top + 96 > vh - margin) top = Math.max(margin, vh - margin - 96);

  const toolbar = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          // Stop pointer events from clearing the browser selection when
          // the user clicks a tool — `onMouseDown preventDefault` keeps
          // the document selection alive while we read it.
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => e.preventDefault()}
          data-selection-toolbar
          className="fixed z-[60] bg-paper border border-gold/40 rounded-2xl shadow-leather px-3 py-2 flex items-center gap-1.5 flex-wrap"
          style={{ left, top, width: TOOLBAR_W }}
        >
          {palette.colors.map((c) => (
            <button
              key={c.cssVar}
              onClick={() => {
                onActiveColorChange?.(c.cssVar);
                onPickHighlight(c.cssVar);
              }}
              title={`${c.name}${c.meaning ? ` · ${c.meaning}` : ""}`}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                (activeColor ?? currentColor) === c.cssVar && !currentlyUnderlined
                  ? "border-leather scale-110"
                  : "border-paper hover:scale-105"
              }`}
              style={{ background: `hsl(var(${c.cssVar}))` }}
            />
          ))}
          <div className="w-px h-5 bg-paper-edge mx-1" />
          <button
            onClick={onPickUnderline}
            title="Underline with pen"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              currentlyUnderlined
                ? "bg-leather text-paper"
                : "bg-paper hover:bg-paper-warm text-leather"
            }`}
          >
            <PenLine className="w-4 h-4" />
          </button>
          <button
            onClick={onNote}
            title="Add note"
            className="w-8 h-8 rounded-full hover:bg-paper-warm flex items-center justify-center text-leather"
          >
            <NotebookPen className="w-4 h-4" />
          </button>
          {onTestFramework && (
            <button
              onClick={onTestFramework}
              title="Test against my framework"
              className="w-8 h-8 rounded-full hover:bg-paper-warm flex items-center justify-center text-leather"
            >
              <Network className="w-4 h-4" />
            </button>
          )}
          {onOpenCompanion && (
            <button
              onClick={onOpenCompanion}
              title="Journal · Dialogue · Belief"
              className="w-8 h-8 rounded-full hover:bg-paper-warm flex items-center justify-center text-leather"
            >
              <BookOpenText className="w-4 h-4" />
            </button>
          )}
          {(currentColor || currentlyUnderlined) && (
            <button
              onClick={onClear}
              title="Remove mark"
              className="w-8 h-8 rounded-full hover:bg-paper-warm flex items-center justify-center text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-paper border border-paper-edge text-muted-foreground text-[10px] hover:bg-paper-warm"
            aria-label="Close"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return toolbar;
  return createPortal(toolbar, document.body);
}