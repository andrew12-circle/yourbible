import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPalette } from "@/lib/bible/palettes";
import { readSafeAreaInsetBottom } from "@/lib/deviceSafeArea";
import type { VerseRange } from "@/lib/bible/verseSelection";
import { Trash2, NotebookPen, PenLine, Network, BookOpenText, Share2 } from "lucide-react";

function useDockToolbar() {
  const [dock, setDock] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setDock(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return dock;
}

export const TOOLBAR_W = 320;
export const TOOLBAR_GAP = 12;
/** Fallback height before first layout measure. */
export const DEFAULT_TOOLBAR_H = 72;

export function computeToolbarPosition(
  rect: { left: number; top: number; right: number; bottom: number },
  opts: {
    vw: number;
    vh: number;
    toolbarW: number;
    toolbarH: number;
    margin?: number;
    dockBottom: boolean;
    safeAreaBottom?: number;
  },
): { left: number; top: number } {
  const margin = opts.margin ?? 8;
  const { vw, vh, toolbarW, toolbarH, dockBottom } = opts;
  const safeAreaBottom = Math.max(0, opts.safeAreaBottom ?? 0);
  const cx = (rect.left + rect.right) / 2;
  let left = Math.round(cx - toolbarW / 2);
  left = Math.max(margin, Math.min(left, vw - margin - toolbarW));

  if (dockBottom) {
    const dockTop = vh - margin - safeAreaBottom - toolbarH;
    if (rect.bottom + TOOLBAR_GAP <= dockTop) {
      return { left: Math.round((vw - toolbarW) / 2), top: dockTop };
    }
    const top = Math.round(rect.top - TOOLBAR_GAP - toolbarH);
    return { left, top: Math.max(margin, top) };
  }

  let top = Math.round(rect.top - TOOLBAR_GAP - toolbarH);
  if (top < margin) {
    top = Math.round(rect.bottom + TOOLBAR_GAP);
  }
  if (top + toolbarH > vh - margin) {
    const above = Math.round(rect.top - TOOLBAR_GAP - toolbarH);
    if (above >= margin) {
      top = above;
    } else {
      top = Math.max(margin, Math.round(rect.bottom + TOOLBAR_GAP));
    }
  }
  return { left, top };
}

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
  onShare?: () => void;
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
  onShare,
  onClose,
}: Props) {
  const palette = getPalette(paletteId);
  const dockBottom = useDockToolbar();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarH, setToolbarH] = useState(DEFAULT_TOOLBAR_H);

  useLayoutEffect(() => {
    if (!open || !toolbarRef.current) return;
    const h = Math.ceil(toolbarRef.current.getBoundingClientRect().height);
    if (h > 0) setToolbarH(h);
  }, [open, paletteId]);

  if (!selection) return null;

  const margin = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const { left, top } = computeToolbarPosition(selection.rect, {
    vw,
    vh,
    toolbarW: TOOLBAR_W,
    toolbarH,
    margin,
    dockBottom,
    safeAreaBottom: readSafeAreaInsetBottom(),
  });

  const toolbar = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={toolbarRef}
          layout
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.15, layout: { duration: 0.12 } }}
          // Stop pointer events from clearing the browser selection when
          // the user clicks a tool — `onMouseDown preventDefault` keeps
          // the document selection alive while we read it.
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          data-selection-toolbar
          className="fixed z-[70] pointer-events-auto bg-paper border border-gold/40 rounded-2xl shadow-leather px-3 py-2 flex items-center gap-1.5 flex-wrap"
          style={{ left, top, width: TOOLBAR_W }}
        >
          {palette.colors.map((c) => (
            <button
              key={c.cssVar}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                onPickHighlight(c.cssVar);
                onActiveColorChange?.(c.cssVar);
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
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => onPickUnderline()}
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
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => onNote()}
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
          {onShare && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={onShare}
              title="Share selection"
              className="w-8 h-8 rounded-full hover:bg-paper-warm flex items-center justify-center text-leather"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {(currentColor || currentlyUnderlined) && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => onClear()}
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