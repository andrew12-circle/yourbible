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

const PAPER_STORAGE_KEY = "sketchpad:paper";

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

const PEN_COLORS: { name: string; value: string }[] = [
  { name: "Ink", value: "#111827" },
  { name: "Slate", value: "#64748b" },
  { name: "Red", value: "#dc2626" },
  { name: "Amber", value: "#d97706" },
  { name: "Emerald", value: "#059669" },
  { name: "Sky", value: "#0284c7" },
  { name: "Indigo", value: "#4338ca" },
  { name: "Rose", value: "#e11d48" },
];

const PEN_SIZES = [2, 4, 6, 10, 16];

const CANVAS_BG = "#ffffff";

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

export default function SketchPad({ open, onClose, onSave, filename }: SketchPadProps) {
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
  const dprRef = useRef<number>(1);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(PEN_COLORS[0].value);
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
  const [paper, setPaper] = useState<Paper>(() => {
    if (typeof window === "undefined") return "blank";
    const stored = window.localStorage.getItem(PAPER_STORAGE_KEY);
    return stored === "ruled" || stored === "graph" || stored === "dot" || stored === "blank"
      ? (stored as Paper)
      : "blank";
  });
  const [hasStrokes, setHasStrokes] = useState(false);
  const [redoCount, setRedoCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PAPER_STORAGE_KEY, paper);
  }, [paper]);

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
    redraw();
  }, []);

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
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
    drawPaper(ctx, paper, w, h);
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
      drawStroke(lctx, stroke);
    }
    if (activeStrokeRef.current) {
      drawStroke(lctx, activeStrokeRef.current);
    }
    lctx.restore();

    // 3. Composite the strokes onto the visible canvas.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }, [paper]);

  // Repaint when the paper style changes (background only; strokes stay).
  useEffect(() => {
    if (!open) return;
    redraw();
  }, [paper, open, redraw]);

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
      setColor(PEN_COLORS[0].value);
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
    // Don't start a new stroke if one is already in progress (palm-rejection
    // heuristic for tablets with finger+stylus active).
    if (activePointerIdRef.current != null) return;
    canvas.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
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
    redraw();
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
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (stroke && stroke.points.length > 0) {
      strokesRef.current.push(stroke);
      setHasStrokes(true);
    }
    redraw();
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
    if (!window.confirm("Clear the sketch? This can't be undone.")) return;
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
      if (!blob) throw new Error("Could not export sketch");
      const base = filename || `sketch-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      const file = new File([blob], `${base}.png`, { type: "image/png" });
      await onSave(file);
      onClose();
    } catch (err) {
      console.error("sketch save error", err);
      window.alert(`Couldn't save sketch: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sketch"
      className="fixed inset-0 z-[80] flex flex-col bg-background"
    >
      {/* Header */}
      <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title="Close sketch"
          aria-label="Close sketch"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center text-[13px] font-medium text-muted-foreground">
          Sketch
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasStrokes || saving}
          size="sm"
        >
          {saving ? "Saving…" : "Save sketch"}
        </Button>
      </header>

      {/* Toolbar */}
      <div
        className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2"
        // Tools shouldn't accidentally pick up pen events meant for the canvas.
        style={{ touchAction: "manipulation" }}
      >
        <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card p-0.5">
          <ToolBtn
            active={tool === "pen"}
            onClick={() => setTool("pen")}
            label="Pen"
          >
            <PenLine className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn
            active={tool === "eraser"}
            onClick={() => setTool("eraser")}
            label="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </ToolBtn>
        </div>

        <div className="flex items-center gap-1">
          {PEN_COLORS.map((c) => (
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
                "h-6 w-6 rounded-full border transition",
                color === c.value && tool === "pen"
                  ? "ring-2 ring-offset-2 ring-offset-background ring-foreground border-transparent"
                  : "border-border/70 hover:scale-110",
              )}
              style={{ background: c.value }}
            />
          ))}
        </div>

        <div
          className="flex items-center gap-1 rounded-md border border-border/60 bg-card p-0.5"
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
                  "flex h-8 items-center gap-1.5 rounded px-2 text-[12px] transition",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
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

        <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card p-0.5">
          {PEN_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              title={`Size ${s}`}
              aria-label={`Size ${s}`}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded transition",
                size === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
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

        <div className="ml-auto flex items-center gap-1">
          <ToolBtn
            onClick={handleUndo}
            disabled={!hasStrokes}
            label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn
            onClick={handleRedo}
            disabled={redoCount === 0}
            label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn
            onClick={handleClear}
            disabled={!hasStrokes}
            label="Clear"
          >
            <RotateCcw className="h-4 w-4" />
          </ToolBtn>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden bg-muted/40 p-3">
        <div
          ref={wrapperRef}
          className="relative h-full w-full overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm"
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none select-none"
            style={{
              touchAction: "none",
              cursor: tool === "pen" ? "crosshair" : "cell",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {!hasStrokes && activeStrokeRef.current == null && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground/70">
              <PenLine className="mb-2 h-6 w-6" />
              <p className="text-sm">Draw with finger, pencil, or stylus</p>
              <p className="mt-1 text-xs">Saved as an image attached to this entry</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      <footer className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Trash2 className="h-3 w-3" />
          Closing without saving discards the sketch
        </span>
        <span className="hidden sm:inline tabular-nums">
          Ctrl/⌘ Z undo · ⇧ Ctrl/⌘ Z redo · After save, handwriting can be transcribed into your entry
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
        "flex h-8 w-8 items-center justify-center rounded transition",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
  }

  // Single tap → dot
  if (pts.length === 1) {
    const p = pts[0];
    const w = strokeWidth(stroke, p.p);
    ctx.beginPath();
    ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
    ctx.fillStyle =
      stroke.tool === "eraser" ? "rgba(0,0,0,1)" : stroke.color;
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

function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, w: number, h: number) {
  if (paper === "blank") return;
  ctx.save();
  if (paper === "ruled") {
    // Faint blue horizontal rules + a red left margin, like a school notebook.
    ctx.strokeStyle = "rgba(99, 162, 214, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Start a bit below the top so the page doesn't feel cramped.
    for (let y = PAPER_SPACING * 1.25; y < h; y += PAPER_SPACING) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (w > NOTEBOOK_MARGIN_X + 40) {
      ctx.strokeStyle = "rgba(220, 38, 38, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(NOTEBOOK_MARGIN_X, 0);
      ctx.lineTo(NOTEBOOK_MARGIN_X, h);
      ctx.stroke();
    }
  } else if (paper === "graph") {
    ctx.strokeStyle = "rgba(99, 162, 214, 0.35)";
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
    ctx.fillStyle = "rgba(120, 120, 130, 0.45)";
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
