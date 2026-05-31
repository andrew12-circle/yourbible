import { useCallback, useEffect, useRef, useState } from "react";
import {
  Eraser,
  Grid2X2,
  GripHorizontal,
  Hand,
  PenLine,
  Redo2,
  RotateCcw,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Day One–style sketch surface.
 *
 * Works with finger, mouse, and Apple Pencil (via Pointer Events). When the
 * pointer reports `pen` with pressure data, stroke width is modulated by
 * pressure so it feels closer to a real pencil. Strokes are kept in memory as
 * vector points so undo/redo and clear are non-destructive — on Save we
 * rasterize to a PNG `File` that flows through the existing journal_photos
 * pipeline (same as a regular photo attachment).
 *
 * We intentionally avoid persisting individual strokes; v1 ships a flat PNG.
 * Treat that PNG as the canonical record. Strokes only live for the duration
 * of the sketching session.
 */

type Tool = "pen" | "eraser";

type Paper = "blank" | "ruled" | "graph" | "dot";

const PAPER_OPTIONS: { id: Paper; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "blank", label: "Blank", icon: Square },
  { id: "ruled", label: "Notebook", icon: GripHorizontal },
  { id: "graph", label: "Graph", icon: Grid2X2 },
  // Reuse Grid2X2 for dot; we'll render an inline dot indicator instead of the icon
  { id: "dot", label: "Dot", icon: Grid2X2 },
];

const DEFAULT_PAPER: Paper = "ruled";

/** Spacing in CSS pixels between rules / grid lines / dots. */
const PAPER_SPACING = 28;
/** Notebook left margin in CSS pixels. */
const NOTEBOOK_MARGIN_X = 56;

interface Point {
  x: number;
  y: number;
  /** 0..1, normalized. 0.5 for inputs that don't report pressure. */
  p: number;
}

interface Stroke {
  tool: Tool;
  color: string;
  /** Logical base width in CSS pixels (gets scaled by pressure). */
  size: number;
  points: Point[];
}

type PenColor = { name: string; value: string };

const DAY_PEN_COLORS: PenColor[] = [
  { name: "Ink", value: "#111827" },
  { name: "Slate", value: "#64748b" },
  { name: "Red", value: "#dc2626" },
  { name: "Amber", value: "#d97706" },
  { name: "Emerald", value: "#059669" },
  { name: "Sky", value: "#0284c7" },
  { name: "Indigo", value: "#4338ca" },
  { name: "Rose", value: "#e11d48" },
];

const NIGHT_PEN_COLORS: PenColor[] = [
  { name: "Ink", value: "#f8fafc" },
  { name: "Slate", value: "#cbd5e1" },
  { name: "Red", value: "#fb7185" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Emerald", value: "#34d399" },
  { name: "Sky", value: "#60a5fa" },
  { name: "Indigo", value: "#a78bfa" },
  { name: "Rose", value: "#f472b6" },
];

const PEN_SIZES = [2, 4, 6, 10, 16];

const DAY_CANVAS_BG = "#ffffff";
const NIGHT_CANVAS_BG = "#05070a";
const NIGHT_MODE_QUERY = "(prefers-color-scheme: dark)";

export interface SketchPadProps {
  open: boolean;
  onClose: () => void;
  onSave: (file: File) => void | Promise<void>;
  /**
   * File name to give the exported PNG (without extension). Defaults to a
   * timestamp-based name.
   */
  filename?: string;
}

function prefersNightMode() {
  return typeof window !== "undefined" && window.matchMedia?.(NIGHT_MODE_QUERY).matches === true;
}

function getPenColors(isNightMode: boolean) {
  return isNightMode ? NIGHT_PEN_COLORS : DAY_PEN_COLORS;
}

function mappedColorForMode(color: string, isNightMode: boolean) {
  const targetColors = getPenColors(isNightMode);
  if (targetColors.some((c) => c.value === color)) return color;
  const source = [...DAY_PEN_COLORS, ...NIGHT_PEN_COLORS].find((c) => c.value === color);
  return targetColors.find((c) => c.name === source?.name)?.value ?? targetColors[0].value;
}

export default function SketchPad({ open, onClose, onSave, filename }: SketchPadProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  /** Offscreen layer that holds only strokes; eraser composites here so paper stays intact. */
  const strokeLayerRef = useRef<HTMLCanvasElement | null>(null);

  const strokesRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  /** Pointer type of the in-progress stroke, so a pen can take over from a palm. */
  const activePointerTypeRef = useRef<string | null>(null);
  /** Set once a stylus is seen this session — enables palm rejection. */
  const penSeenRef = useRef<boolean>(false);
  const redrawFrameRef = useRef<number | null>(null);
  const dprRef = useRef<number>(1);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const [tool, setTool] = useState<Tool>("pen");
  const [isNightMode, setIsNightMode] = useState(prefersNightMode);
  const isNightModeRef = useRef(isNightMode);
  const [color, setColor] = useState<string>(() => getPenColors(prefersNightMode())[0].value);
  const [size, setSize] = useState<number>(PEN_SIZES[1]);
  /**
   * When on (default), once an Apple Pencil / stylus has been detected we
   * ignore finger & palm (`touch`) input on the canvas — just like Apple Notes.
   * Turn it off to draw with a finger.
   */
  const [palmRejection, setPalmRejection] = useState(true);
  const palmRejectionRef = useRef(palmRejection);
  useEffect(() => {
    palmRejectionRef.current = palmRejection;
  }, [palmRejection]);
  const [paper, setPaper] = useState<Paper>(DEFAULT_PAPER);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [redoCount, setRedoCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const penColors = getPenColors(isNightMode);

  useEffect(() => {
    isNightModeRef.current = isNightMode;
  }, [isNightMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(NIGHT_MODE_QUERY);
    const syncNightMode = () => setIsNightMode(media.matches);
    syncNightMode();
    media.addEventListener?.("change", syncNightMode);
    return () => media.removeEventListener?.("change", syncNightMode);
  }, []);

  useEffect(() => {
    setColor((current) => mappedColorForMode(current, isNightMode));
  }, [isNightMode]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    const { w, h } = sizeRef.current;

    // 1. Paint the paper (background + ruled / grid / dot pattern).
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = isNightMode ? NIGHT_CANVAS_BG : DAY_CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
    drawPaper(ctx, paper, w, h, isNightMode);
    ctx.restore();

    // 2. Re-render the strokes on the offscreen layer so the eraser only
    //    cuts ink, never the paper underneath.
    const layer = strokeLayerRef.current;
    if (!layer) return;
    const lctx = layer.getContext("2d");
    if (!lctx) return;
    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, layer.width, layer.height);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const stroke of strokesRef.current) {
      drawStroke(lctx, stroke, isNightMode);
    }
    if (activeStrokeRef.current) {
      drawStroke(lctx, activeStrokeRef.current, isNightMode);
    }
    lctx.restore();

    // 3. Composite the strokes onto the visible canvas.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }, [isNightMode, paper]);

  const scheduleRedraw = useCallback(() => {
    if (redrawFrameRef.current != null) return;
    redrawFrameRef.current = window.requestAnimationFrame(() => {
      redrawFrameRef.current = null;
      redraw();
    });
  }, [redraw]);

  const flushRedraw = useCallback(() => {
    if (redrawFrameRef.current != null) {
      window.cancelAnimationFrame(redrawFrameRef.current);
      redrawFrameRef.current = null;
    }
    redraw();
  }, [redraw]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapperRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    dprRef.current = dpr;
    sizeRef.current = { w: rect.width, h: rect.height };
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    if (!strokeLayerRef.current) {
      strokeLayerRef.current = document.createElement("canvas");
    }
    const layer = strokeLayerRef.current;
    layer.width = canvas.width;
    layer.height = canvas.height;
    flushRedraw();
  }, [flushRedraw]);

  // Repaint when the paper style changes (background only; strokes stay).
  useEffect(() => {
    if (!open) return;
    flushRedraw();
  }, [paper, open, flushRedraw]);

  // Safari/iPadOS can still open text-selection or callout UI from long-press
  // gestures unless these native defaults are blocked with non-passive listeners.
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    const drawingSurfaces = [wrap, canvas].filter(Boolean) as HTMLElement[];
    const preventDefault = (event: Event) => event.preventDefault();
    const nonPassive = { passive: false } as AddEventListenerOptions;

    root?.addEventListener("selectstart", preventDefault);
    root?.addEventListener("dragstart", preventDefault);
    root?.addEventListener("contextmenu", preventDefault);

    for (const surface of drawingSurfaces) {
      surface.addEventListener("touchstart", preventDefault, nonPassive);
      surface.addEventListener("touchmove", preventDefault, nonPassive);
      surface.addEventListener("touchend", preventDefault, nonPassive);
      surface.addEventListener("touchcancel", preventDefault, nonPassive);
      surface.addEventListener("gesturestart", preventDefault, nonPassive);
      surface.addEventListener("gesturechange", preventDefault, nonPassive);
      surface.addEventListener("gestureend", preventDefault, nonPassive);
    }

    return () => {
      root?.removeEventListener("selectstart", preventDefault);
      root?.removeEventListener("dragstart", preventDefault);
      root?.removeEventListener("contextmenu", preventDefault);

      for (const surface of drawingSurfaces) {
        surface.removeEventListener("touchstart", preventDefault, nonPassive);
        surface.removeEventListener("touchmove", preventDefault, nonPassive);
        surface.removeEventListener("touchend", preventDefault, nonPassive);
        surface.removeEventListener("touchcancel", preventDefault, nonPassive);
        surface.removeEventListener("gesturestart", preventDefault, nonPassive);
        surface.removeEventListener("gesturechange", preventDefault, nonPassive);
        surface.removeEventListener("gestureend", preventDefault, nonPassive);
      }
    };
  }, [open]);

  // Initial size + window resize
  useEffect(() => {
    if (!open) return;
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [open, resizeCanvas]);

  useEffect(() => {
    if (open) return;
    if (redrawFrameRef.current != null) {
      window.cancelAnimationFrame(redrawFrameRef.current);
      redrawFrameRef.current = null;
    }
  }, [open]);

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      strokesRef.current = [];
      redoStackRef.current = [];
      activeStrokeRef.current = null;
      activePointerIdRef.current = null;
      activePointerTypeRef.current = null;
      penSeenRef.current = false;
      setHasStrokes(false);
      setRedoCount(0);
      setTool("pen");
      setColor(getPenColors(isNightModeRef.current)[0].value);
      setSize(PEN_SIZES[1]);
      // Give layout a tick to mount before sizing
      requestAnimationFrame(() => resizeCanvas());
    }
  }, [open, resizeCanvas]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) handleRedo();
        else handleUndo();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getPoint = (canvas: HTMLCanvasElement, e: React.PointerEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Some browsers report 0 pressure for non-pen pointers; fall back to 0.5
    // so strokes have consistent thickness.
    const raw = e.pressure;
    const p =
      e.pointerType === "pen" && raw > 0 && raw <= 1
        ? raw
        : raw > 0 && raw <= 1
          ? raw
          : 0.5;
    return { x, y, p };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Remember that a stylus has touched the surface this session.
    if (e.pointerType === "pen") penSeenRef.current = true;

    // Palm rejection: once a stylus has been used, ignore finger / palm
    // (`touch`) input on the canvas — matches Apple Notes behaviour.
    if (
      palmRejectionRef.current &&
      penSeenRef.current &&
      e.pointerType === "touch"
    ) {
      e.preventDefault();
      return;
    }

    if (activePointerIdRef.current != null) {
      // A stylus that arrives while a palm/finger stroke is in progress takes
      // over: discard the stray stroke so the pen starts cleanly.
      const takeover =
        e.pointerType === "pen" && activePointerTypeRef.current === "touch";
      if (!takeover) return;
      try {
        canvas.releasePointerCapture(activePointerIdRef.current);
      } catch {
        /* noop */
      }
      activeStrokeRef.current = null;
    }
    canvas.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;
    const pt = getPoint(canvas, e);
    activeStrokeRef.current = {
      tool,
      color,
      size,
      points: [pt],
    };
    redoStackRef.current = [];
    setRedoCount(0);
    redraw();
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    // Use coalesced events when available for smoother lines on high-Hz styluses.
    const events = typeof e.nativeEvent.getCoalescedEvents === "function"
      ? e.nativeEvent.getCoalescedEvents()
      : [];
    if (events.length > 0) {
      const rect = canvas.getBoundingClientRect();
      for (const ev of events) {
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const raw = ev.pressure;
        const p = raw > 0 && raw <= 1 ? raw : 0.5;
        stroke.points.push({ x, y, p });
      }
    } else {
      stroke.points.push(getPoint(canvas, e));
    }
    scheduleRedraw();
    e.preventDefault();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (stroke && stroke.points.length > 0) {
      strokesRef.current.push(stroke);
      setHasStrokes(true);
    }
    flushRedraw();
    e.preventDefault();
  };

  const handleUndo = () => {
    const popped = strokesRef.current.pop();
    if (popped) {
      redoStackRef.current.push(popped);
      setHasStrokes(strokesRef.current.length > 0);
      setRedoCount(redoStackRef.current.length);
      redraw();
    }
  };

  const handleRedo = () => {
    const popped = redoStackRef.current.pop();
    if (popped) {
      strokesRef.current.push(popped);
      setHasStrokes(true);
      setRedoCount(redoStackRef.current.length);
      redraw();
    }
  };

  const handleClear = () => {
    if (strokesRef.current.length === 0) return;
    if (!window.confirm("Clear the handwritten note? This can't be undone.")) return;
    strokesRef.current = [];
    redoStackRef.current = [];
    setHasStrokes(false);
    setRedoCount(0);
    redraw();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes || saving) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("Could not export handwritten note");
      const base = filename || `sketch-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      const file = new File([blob], `${base}.png`, { type: "image/png" });
      await onSave(file);
      onClose();
    } catch (err) {
      console.error("handwritten save error", err);
      window.alert(`Couldn't save handwritten note: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Handwritten"
      className={cn("fixed inset-0 z-[80] flex select-none flex-col", isNightMode ? "dark bg-slate-950 text-slate-100" : "bg-background")}
      style={{
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        height: "100dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* Header */}
      <header className={cn("flex h-11 flex-shrink-0 items-center gap-2 border-b px-3", isNightMode ? "border-white/10 bg-slate-950/95" : "border-border/50 bg-white/95")}>
        <button
          type="button"
          onClick={onClose}
          className={cn("rounded-full p-1.5 transition", isNightMode ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          title="Close handwritten"
          aria-label="Close handwritten"
        >
          <X className="h-4 w-4" />
        </button>
        <div className={cn("flex-1 text-center text-[13px] font-medium", isNightMode ? "text-slate-300" : "text-muted-foreground")}>
          Handwritten
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasStrokes || saving}
          size="sm"
          variant="ghost"
          className={cn("h-8 rounded-full px-3 text-[13px] font-medium", isNightMode ? "text-sky-300 hover:bg-sky-400/10 hover:text-sky-200 disabled:text-slate-500" : "text-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:text-muted-foreground")}
        >
          {saving ? (
            "Saving…"
          ) : (
            <>
              <span className="hidden sm:inline">Save handwritten</span>
              <span className="sm:hidden">Save</span>
            </>
          )}
        </Button>
      </header>

      {/* Toolbar */}
      <div
        className={cn("relative z-10 flex-shrink-0 overflow-x-auto overscroll-x-contain border-b px-2 py-1.5 shadow-sm backdrop-blur-xl sm:px-3 sm:py-2", isNightMode ? "border-white/10 bg-slate-950/90" : "border-border/40 bg-white/90")}
        // Tools shouldn't accidentally pick up pen events meant for the canvas.
        style={{ touchAction: "manipulation" }}
      >
        <div
          className={cn("mx-auto flex w-max min-w-full max-w-none flex-nowrap items-center gap-1.5 rounded-[1.35rem] border p-1 shadow-[0_8px_24px_rgba(15,23,42,0.10)] sm:min-w-0 sm:max-w-6xl", isNightMode ? "border-white/10 bg-slate-900/90 shadow-black/30" : "border-black/10 bg-white/90")}
          role="toolbar"
          aria-label="Handwritten tools"
        >
          <div className={cn("flex items-center gap-0.5 rounded-full p-0.5", isNightMode ? "bg-slate-800/90" : "bg-slate-100/90")}>
            <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} label="Pen">
              <PenLine className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} label="Eraser">
              <Eraser className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn
              active={palmRejection}
              onClick={() => setPalmRejection((v) => !v)}
              label={
                palmRejection
                  ? "Palm rejection on — ignores finger/palm once a pencil is used"
                  : "Palm rejection off — finger drawing allowed"
              }
            >
              <Hand className="h-4 w-4" />
            </ToolBtn>
          </div>

          <div className={cn("mx-1 h-6 w-px", isNightMode ? "bg-white/10" : "bg-border/70")} aria-hidden />

          <div className={cn("flex items-center gap-1 rounded-full px-1.5 py-1", isNightMode ? "bg-slate-800/90" : "bg-slate-100/90")}>
            {penColors.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setColor(c.value);
                  if (tool === "eraser") setTool("pen");
                }}
                title={c.name}
                aria-label={`Color ${c.name}`}
                className={cn(
                  "h-10 w-10 flex-shrink-0 rounded-full border transition hover:scale-110 sm:h-5 sm:w-5",
                  isNightMode ? "border-white/20" : "border-black/10",
                  color === c.value &&
                    tool === "pen" &&
                    (isNightMode
                      ? "ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-900"
                      : "ring-2 ring-blue-500 ring-offset-2 ring-offset-white"),
                )}
                style={{ background: c.value }}
              />
            ))}
          </div>

          <div className={cn("mx-1 h-6 w-px", isNightMode ? "bg-white/10" : "bg-border/70")} aria-hidden />

          <div
            className={cn("flex items-center gap-0.5 rounded-full p-0.5", isNightMode ? "bg-slate-800/90" : "bg-slate-100/90")}
            role="radiogroup"
            aria-label="Paper style"
          >
            {PAPER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = paper === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPaper(opt.id)}
                  title={`${opt.label} paper`}
                  aria-label={`${opt.label} paper`}
                  className={cn(
                    "flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition sm:h-8 sm:px-2.5",
                    active
                      ? isNightMode
                        ? "bg-slate-700 text-white shadow-sm"
                        : "bg-white text-foreground shadow-sm"
                      : isNightMode
                        ? "text-slate-300 hover:bg-white/10 hover:text-white"
                        : "text-muted-foreground hover:bg-white/70 hover:text-foreground",
                  )}
                >
                  {opt.id === "dot" ? (
                    <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
                      <span className="block h-1 w-1 rounded-full bg-current" />
                    </span>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className={cn("mx-1 h-6 w-px", isNightMode ? "bg-white/10" : "bg-border/70")} aria-hidden />

          <div className={cn("flex items-center gap-0.5 rounded-full p-0.5", isNightMode ? "bg-slate-800/90" : "bg-slate-100/90")}>
            {PEN_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                title={`Size ${s}`}
                aria-label={`Size ${s}`}
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition sm:h-8 sm:w-8",
                  size === s
                    ? isNightMode
                      ? "bg-slate-700 text-white shadow-sm"
                      : "bg-white text-foreground shadow-sm"
                    : isNightMode
                      ? "text-slate-300 hover:bg-white/10"
                      : "text-muted-foreground hover:bg-white/70",
                )}
              >
                <span
                  className="block rounded-full"
                  style={{
                    width: Math.min(s, 14),
                    height: Math.min(s, 14),
                    background: size === s ? "currentColor" : color,
                  }}
                />
              </button>
            ))}
          </div>

          <div className={cn("mx-1 h-6 w-px", isNightMode ? "bg-white/10" : "bg-border/70")} aria-hidden />

          <div className={cn("flex items-center gap-0.5 rounded-full p-0.5", isNightMode ? "bg-slate-800/90" : "bg-slate-100/90")}>
            <ToolBtn onClick={handleUndo} disabled={!hasStrokes} label="Undo">
              <Undo2 className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={handleRedo} disabled={redoCount === 0} label="Redo">
              <Redo2 className="h-4 w-4" />
            </ToolBtn>
            <ToolBtn onClick={handleClear} disabled={!hasStrokes} label="Clear">
              <RotateCcw className="h-4 w-4" />
            </ToolBtn>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className={cn("relative min-h-0 flex-1 overflow-hidden p-1.5 sm:p-3", isNightMode ? "bg-black" : "bg-muted/40")}>
        <div
          ref={wrapperRef}
          className={cn("relative h-full w-full overflow-hidden rounded-lg border shadow-sm sm:rounded-xl", isNightMode ? "border-white/10 bg-black" : "border-border/60 bg-white")}
          style={{
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            touchAction: "none",
            overscrollBehavior: "none",
          }}
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none select-none"
            style={{
              touchAction: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              cursor: tool === "pen" ? "crosshair" : "cell",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {!hasStrokes && activeStrokeRef.current == null && (
            <div className={cn("pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center", isNightMode ? "text-slate-400/80" : "text-muted-foreground/70")}>
              <PenLine className="mb-2 h-6 w-6" />
              <p className="text-sm">Draw with finger, pencil, or stylus</p>
              <p className="mt-1 text-xs">
                Palm rejection is on — rest your hand freely once you start with the pencil
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <footer className={cn("hidden flex-shrink-0 items-center justify-between gap-3 border-t px-4 py-2 text-[11px] sm:flex", isNightMode ? "border-white/10 bg-slate-950/90 text-slate-400" : "border-border/50 bg-white/90 text-muted-foreground")}>
        <span className="inline-flex items-center gap-1">
          <Trash2 className="h-3 w-3" />
          Closing without saving discards the handwritten note
        </span>
        <span className="hidden sm:inline tabular-nums">
          Ctrl/⌘ Z undo · ⇧ Ctrl/⌘ Z redo · After save, this can be transcribed into your entry
        </span>
      </footer>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition sm:h-8 sm:w-8",
        active
          ? "bg-white text-foreground shadow-sm dark:bg-slate-700 dark:text-white"
          : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
        disabled &&
          "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-muted-foreground dark:hover:bg-transparent dark:hover:text-slate-300",
      )}
    >
      {children}
    </button>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, isNightMode = false) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = mappedColorForMode(stroke.color, isNightMode);
  }

  // Single tap → dot
  if (pts.length === 1) {
    const p = pts[0];
    const w = strokeWidth(stroke, p.p);
    ctx.beginPath();
    ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
    ctx.fillStyle =
      stroke.tool === "eraser" ? "rgba(0,0,0,1)" : mappedColorForMode(stroke.color, isNightMode);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  // Draw as a sequence of short quadratic segments for smoothing. Width is
  // adjusted per segment so pressure variation is preserved.
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const w = strokeWidth(stroke, (a.p + b.p) / 2);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(a.x, a.y, midX, midY);
    ctx.stroke();
  }
  // Cap off the last segment
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const wLast = strokeWidth(stroke, last.p);
  ctx.lineWidth = wLast;
  ctx.beginPath();
  ctx.moveTo((prev.x + last.x) / 2, (prev.y + last.y) / 2);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  ctx.globalCompositeOperation = "source-over";
}

function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, w: number, h: number, isNightMode = false) {
  if (paper === "blank") return;
  ctx.save();
  if (paper === "ruled") {
    // Faint blue horizontal rules + a red left margin, like a school notebook.
    ctx.strokeStyle = isNightMode ? "rgba(96, 165, 250, 0.34)" : "rgba(99, 162, 214, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Start a bit below the top so the page doesn't feel cramped.
    for (let y = PAPER_SPACING * 1.25; y < h; y += PAPER_SPACING) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (w > NOTEBOOK_MARGIN_X + 40) {
      ctx.strokeStyle = isNightMode ? "rgba(248, 113, 113, 0.44)" : "rgba(220, 38, 38, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(NOTEBOOK_MARGIN_X, 0);
      ctx.lineTo(NOTEBOOK_MARGIN_X, h);
      ctx.stroke();
    }
  } else if (paper === "graph") {
    ctx.strokeStyle = isNightMode ? "rgba(96, 165, 250, 0.24)" : "rgba(99, 162, 214, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = PAPER_SPACING; x < w; x += PAPER_SPACING) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = PAPER_SPACING; y < h; y += PAPER_SPACING) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  } else if (paper === "dot") {
    ctx.fillStyle = isNightMode ? "rgba(203, 213, 225, 0.44)" : "rgba(120, 120, 130, 0.45)";
    const r = 1;
    for (let y = PAPER_SPACING; y < h; y += PAPER_SPACING) {
      for (let x = PAPER_SPACING; x < w; x += PAPER_SPACING) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function strokeWidth(stroke: Stroke, pressure: number) {
  // Eraser is uniform; pen scales with pressure (0.5 = base width).
  if (stroke.tool === "eraser") return stroke.size * 2.5;
  const min = 0.5;
  const max = 1.6;
  const factor = min + (max - min) * Math.max(0, Math.min(1, pressure));
  return stroke.size * factor;
}
