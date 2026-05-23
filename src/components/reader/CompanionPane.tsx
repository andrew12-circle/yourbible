import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Minus, NotebookPen, MessageSquare, Sparkles, GripVertical,
  PanelRightClose, PanelLeftClose, PanelBottomClose,
} from "lucide-react";
import { useCompanion, scopeRef, type DockMode } from "@/lib/reader/companionStore";
import { CompanionJournalTab } from "./CompanionJournalTab";
import { CompanionDialogueTab } from "./CompanionDialogueTab";
import { CompanionBeliefTab } from "./CompanionBeliefTab";
import { useIsMobile } from "@/hooks/use-mobile";

export function CompanionPane() {
  const {
    open, minimized, tab, scope, pos, setOpen, setMinimized, setTab, setPos,
  } = useCompanion();
  const isMobile = useIsMobile();
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Snap to docks
  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      if (pos.dock === "right") setPos({ x: vw - pos.w - 24, y: 80 });
      if (pos.dock === "left") setPos({ x: 24, y: 80 });
      if (pos.dock === "bottom") setPos({ x: 24, y: vh - pos.h - 24, w: vw - 48 });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, pos.dock, pos.w, pos.h, setPos]);

  const setDock = (dock: DockMode) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (dock === "right") setPos({ dock, x: vw - pos.w - 24, y: 80 });
    else if (dock === "left") setPos({ dock, x: 24, y: 80 });
    else if (dock === "bottom") setPos({ dock, x: 24, y: vh - 360 - 24, w: vw - 48, h: 360 });
    else setPos({ dock });
  };

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if (isMobile) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setPos({ x: dragRef.current.px + dx, y: dragRef.current.py + dy, dock: "float" });
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    // snap to edges if close
    const vw = window.innerWidth, vh = window.innerHeight;
    const right = vw - (pos.x + pos.w);
    if (pos.x < 16) setDock("left");
    else if (right < 16) setDock("right");
    else if (vh - (pos.y + pos.h) < 16) setDock("bottom");
    void e;
  };

  // Resize from bottom-right
  const resizeRef = useRef<{ w: number; h: number; x: number; y: number } | null>(null);
  const onResizeDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    resizeRef.current = { w: pos.w, h: pos.h, x: e.clientX, y: e.clientY };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.x;
    const dy = e.clientY - resizeRef.current.y;
    setPos({
      w: Math.max(320, Math.min(window.innerWidth - 32, resizeRef.current.w + dx)),
      h: Math.max(280, Math.min(window.innerHeight - 32, resizeRef.current.h + dy)),
    });
  };
  const onResizeUp = () => { resizeRef.current = null; };

  // ----- minimized pill -----
  if (open && minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-[calc(var(--safe-area-inset-bottom)+1.25rem)] right-5 z-[60] bg-leather text-paper rounded-full shadow-leather px-4 py-2.5 flex items-center gap-2 text-sm font-medium hover:scale-105 transition"
      >
        <NotebookPen className="w-4 h-4" />
        {scope ? scopeRef(scope) : "Companion"}
      </button>
    );
  }

  if (!open) return null;

  // Mobile: bottom sheet
  const style: React.CSSProperties = isMobile
    ? {
        left: 0,
        right: 0,
        bottom: "var(--safe-area-inset-bottom)",
        top: "auto",
        width: "100%",
        height: "min(78vh, calc(100dvh - var(--safe-area-inset-bottom)))",
        borderRadius: "20px 20px 0 0",
      }
    : { left: pos.x, top: pos.y, width: pos.w, height: pos.h };

  return (
    <AnimatePresence>
      <motion.div
        key="companion"
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="fixed z-[55] bg-paper border border-paper-edge shadow-leather rounded-2xl flex flex-col overflow-hidden"
        style={style}
      >
        {/* Header */}
        <div
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerUp}
          className={`flex items-center gap-2 px-3 py-2 border-b border-paper-edge bg-paper-warm/60 ${isMobile ? "" : "cursor-move"} ${dragging ? "select-none" : ""}`}
        >
          {!isMobile && <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />}
          <div className="text-xs font-semibold tracking-wide ink-text truncate">
            {scope ? scopeRef(scope) : "Reader Companion"}
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            {!isMobile && (
              <>
                <button onClick={() => setDock("left")}
                  title="Dock left"
                  className={`w-7 h-7 rounded-md flex items-center justify-center hover:bg-paper-warm ${pos.dock === "left" ? "bg-paper-warm" : ""}`}>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDock("right")}
                  title="Dock right"
                  className={`w-7 h-7 rounded-md flex items-center justify-center hover:bg-paper-warm ${pos.dock === "right" ? "bg-paper-warm" : ""}`}>
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDock("bottom")}
                  title="Dock bottom"
                  className={`w-7 h-7 rounded-md flex items-center justify-center hover:bg-paper-warm ${pos.dock === "bottom" ? "bg-paper-warm" : ""}`}>
                  <PanelBottomClose className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-paper-edge mx-1" />
              </>
            )}
            <button onClick={() => setMinimized(true)}
              title="Minimize"
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-paper-warm">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)}
              title="Close"
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-paper-warm">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-paper-edge bg-paper">
          {([
            { id: "journal", label: "Journal", icon: NotebookPen },
            { id: "dialogue", label: "Dialogue", icon: MessageSquare },
            { id: "belief", label: "Belief", icon: Sparkles },
          ] as const).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "text-leather border-b-2 border-leather -mb-px"
                    : "text-muted-foreground hover:text-leather"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {!scope ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Select a verse or open the chapter to begin.
            </div>
          ) : tab === "journal" ? (
            <CompanionJournalTab />
          ) : tab === "dialogue" ? (
            <CompanionDialogueTab />
          ) : (
            <CompanionBeliefTab />
          )}
        </div>

        {/* Resize handle */}
        {!isMobile && pos.dock === "float" && (
          <div
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
            style={{
              background:
                "linear-gradient(135deg, transparent 0 50%, hsl(var(--paper-edge)) 50% 60%, transparent 60% 70%, hsl(var(--paper-edge)) 70% 80%, transparent 80%)",
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}