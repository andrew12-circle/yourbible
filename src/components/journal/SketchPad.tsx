import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHandwrittenPreferredJournal, useIsTablet, useIsTabletPortrait } from "@/hooks/use-reader-layout";
import { useLockPageZoom } from "@/hooks/useLockPageZoom";
import SketchInkToolbar, { type SketchPaper } from "@/components/journal/sketch/SketchInkToolbar";
import SketchRulerOverlay from "@/components/journal/sketch/SketchRulerOverlay";
import {
  clearSketchDraft,
  loadSketchDraft,
  saveSketchDraft,
} from "@/lib/journal/sketchDraft";
import {
  normalizeInkPressure,
  projectPointOntoRuler,
} from "@/lib/ink/strokeRender";
import { getSketchPenColors, mappedSketchColorForMode } from "@/lib/journal/sketchInkColors";
import { rulerSpanLength } from "@/lib/journal/sketchRuler";
import { canvasBackground, drawPaper, drawStroke } from "@/lib/journal/sketchCanvasDraw";
import { INK_TOOL_PRESETS, normalizeInkDrawTool } from "@/lib/ink/toolPresets";
import type { InkDrawTool, InkStroke, InkTool } from "@/lib/ink/types";
import { cn } from "@/lib/utils";
import { useSketchPadPersistence } from "@/hooks/useSketchPadCanvas";

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

const DEFAULT_PAPER: SketchPaper = "ruled";

interface Point {
  x: number;
  y: number;
  /** 0..1, normalized. 0.5 for inputs that don't report pressure. */
  p: number;
}

type Stroke = InkStroke;

const PEN_SIZES = [2, 4, 6, 10, 16];

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
  /** `localStorage` key segment for stroke drafts (survives leaving the page). */
  draftKey?: string;
  /** Upload PNG periodically while drawing (requires a saved journal entry). */
  onAutosave?: (file: File) => void | Promise<void>;
  /**
   * When the pad closes with ink that was not saved via the Save button, export a
   * PNG and pass it here (e.g. attach to a compose draft before the entry exists).
   */
  onUnsavedExit?: (file: File) => void | Promise<void>;
  /** Full-screen modal (default) or fill the parent panel (artifact journal under video). */
  layout?: "modal" | "inline";
  /** Shown in the inline header (e.g. video title). */
  inlineTitle?: string;
  /** Inline under artifact video: edge-to-edge paper and toolbar. */
  fullBleed?: boolean;
  /** Keep stroke draft after Save (continue editing the same page). */
  clearDraftOnSave?: boolean;
  /** Restored PNG when stroke draft is empty (returning to a saved page). */
  backgroundImageUrl?: string | null;
  /** Show "New page" in the header (artifact journal). */
  showNewPage?: boolean;
  onNewPage?: () => void;
}

function prefersNightMode() {
  return typeof window !== "undefined" && window.matchMedia?.(NIGHT_MODE_QUERY).matches === true;
}

const MIN_VIEW_SCALE = 1;
const MAX_VIEW_SCALE = 3;

export default function SketchPad({
  open,
  onClose,
  onSave,
  filename,
  draftKey,
  onAutosave,
  onUnsavedExit,
  layout = "modal",
  inlineTitle,
  fullBleed = false,
  clearDraftOnSave = true,
  backgroundImageUrl = null,
  showNewPage = false,
  onNewPage,
}: SketchPadProps) {
  const isInline = layout === "inline";
  const tabletPortrait = useIsTabletPortrait();
  const tablet = useIsTablet();
  const preferHandwritten = useHandwrittenPreferredJournal();
  const disableViewZoom = preferHandwritten;
  const edgeToEdgePaper = Boolean(isInline && fullBleed) || tablet;
  useLockPageZoom(open && disableViewZoom);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<HTMLDivElement | null>(null);
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

  const [tool, setTool] = useState<InkTool>("fountain");
  const lastDrawToolRef = useRef<InkDrawTool>("fountain");
  const customColorRef = useRef<HTMLInputElement | null>(null);
  const [rulerVisible, setRulerVisible] = useState(false);
  const [rulerCenter, setRulerCenter] = useState({ x: 200, y: 200 });
  const [rulerAngle, setRulerAngle] = useState(35);
  const [rulerLength, setRulerLength] = useState(400);
  const [snapToRuler, setSnapToRuler] = useState(true);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const rulerDragRef = useRef<{ mode: "move" | "rotate"; startAngle?: number; startPointerAngle?: number } | null>(
    null,
  );
  const lassoPointsRef = useRef<Point[]>([]);
  const [isNightMode, setIsNightMode] = useState(prefersNightMode);
  const isNightModeRef = useRef(isNightMode);
  const [color, setColor] = useState<string>(() => getSketchPenColors(prefersNightMode())[0].value);
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
  const [paper, setPaper] = useState<SketchPaper>(DEFAULT_PAPER);
  const drawWithFinger = !palmRejection;
  const [hasStrokes, setHasStrokes] = useState(false);
  const [redoCount, setRedoCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [viewScale, setViewScale] = useState(1);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const viewScaleRef = useRef(1);
  const viewPanRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    panX: number;
    panY: number;
    midX: number;
    midY: number;
  } | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const savedViaButtonRef = useRef(false);
  const penColors = getSketchPenColors(isNightMode);

  useEffect(() => {
    viewScaleRef.current = viewScale;
  }, [viewScale]);

  useEffect(() => {
    viewPanRef.current = viewPan;
  }, [viewPan]);

  useEffect(() => {
    if (!open || !disableViewZoom) return;
    setViewScale(1);
    setViewPan({ x: 0, y: 0 });
    pinchRef.current = null;
  }, [open, disableViewZoom]);

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
    setColor((current) => mappedSketchColorForMode(current, isNightMode));
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
    ctx.fillStyle = canvasBackground(paper, isNightMode);
    ctx.fillRect(0, 0, w, h);
    drawPaper(ctx, paper, w, h, isNightMode);
    const bg = backgroundImageRef.current;
    if (bg?.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, w, h);
    }
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

  const persistDraft = useCallback(() => {
    if (!draftKey) return;
    saveSketchDraft(draftKey, {
      strokes: strokesRef.current,
      paper,
      color,
      size,
      tool,
      rulerVisible,
      rulerAngle,
    });
  }, [draftKey, paper, color, size, tool, rulerVisible, rulerAngle]);

  const exportPngFile = useCallback(async (): Promise<File | null> => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return null;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return null;
    const base = filename || `sketch-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    return new File([blob], `${base}.png`, { type: "image/png" });
  }, [filename]);

  const { notifyStrokeChange, flushAutosave, clearTimers, draftTimerRef } = useSketchPadPersistence({
    draftKey,
    onAutosave,
    exportPng: exportPngFile,
    persistDraft,
    hasStrokes: () => strokesRef.current.length > 0,
  });

  const clampViewScale = (scale: number) =>
    Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, scale));

  const setZoom = useCallback((next: number) => {
    setViewScale(clampViewScale(next));
  }, []);

  const resetView = useCallback(() => {
    setViewScale(1);
    setViewPan({ x: 0, y: 0 });
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapperRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    dprRef.current = dpr;
    sizeRef.current = { w: rect.width, h: rect.height };
    setRulerCenter((prev) =>
      prev.x === 200 && prev.y === 200
        ? { x: rect.width / 2, y: rect.height / 2 }
        : prev,
    );
    setRulerLength(rulerSpanLength(rect.width, rect.height));
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

  const flushRedrawRef = useRef(flushRedraw);
  const resizeCanvasRef = useRef(resizeCanvas);
  const resetViewRef = useRef(resetView);
  flushRedrawRef.current = flushRedraw;
  resizeCanvasRef.current = resizeCanvas;
  resetViewRef.current = resetView;

  const handlePaperChange = useCallback(
    (next: SketchPaper) => {
      setPaper(next);
      if (!draftKey) return;
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
      saveSketchDraft(draftKey, {
        strokes: strokesRef.current,
        paper: next,
        color,
        size,
        tool,
        rulerVisible,
        rulerAngle,
      });
    },
    [color, draftKey, rulerAngle, rulerVisible, size, tool],
  );

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

    const preventSingleTouchScroll = (event: Event) => {
      if (!(event instanceof TouchEvent) || !event.touches || event.touches.length >= 2) return;
      event.preventDefault();
    };

    for (const surface of drawingSurfaces) {
      surface.addEventListener("touchstart", preventSingleTouchScroll, nonPassive);
      surface.addEventListener("touchmove", preventSingleTouchScroll, nonPassive);
      surface.addEventListener("gesturestart", preventDefault, nonPassive);
      surface.addEventListener("gesturechange", preventDefault, nonPassive);
      surface.addEventListener("gestureend", preventDefault, nonPassive);
    }

    return () => {
      root?.removeEventListener("selectstart", preventDefault);
      root?.removeEventListener("dragstart", preventDefault);
      root?.removeEventListener("contextmenu", preventDefault);

      for (const surface of drawingSurfaces) {
        surface.removeEventListener("touchstart", preventSingleTouchScroll, nonPassive);
        surface.removeEventListener("touchmove", preventSingleTouchScroll, nonPassive);
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

  useEffect(() => {
    if (!open || !backgroundImageUrl) {
      backgroundImageRef.current = null;
      return;
    }
    const draft = draftKey ? loadSketchDraft(draftKey) : null;
    const hasDraftStrokes = (draft?.strokes?.length ?? 0) > 0;
    if (hasDraftStrokes) {
      backgroundImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      backgroundImageRef.current = img;
      flushRedrawRef.current();
    };
    img.onerror = () => {
      backgroundImageRef.current = null;
    };
    img.src = backgroundImageUrl;
  }, [open, backgroundImageUrl, draftKey]);

  // Reset / restore when opened
  useEffect(() => {
    if (!open) return;
    const draft = draftKey ? loadSketchDraft(draftKey) : null;
    strokesRef.current = draft?.strokes ?? [];
    redoStackRef.current = [];
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;
    penSeenRef.current = false;
    setHasStrokes(strokesRef.current.length > 0);
    setRedoCount(0);
    const restoredTool = draft?.tool ?? "fountain";
    setTool(restoredTool);
    if (restoredTool !== "ruler" && restoredTool !== "lasso") {
      lastDrawToolRef.current = restoredTool;
    }
    setRulerVisible(draft?.rulerVisible ?? false);
    setRulerAngle(draft?.rulerAngle ?? 0);
    setPaper(draft?.paper ?? DEFAULT_PAPER);
    setColor(
      draft?.color
        ? mappedSketchColorForMode(draft.color, isNightModeRef.current)
        : getSketchPenColors(isNightModeRef.current)[0].value,
    );
    setSize(draft?.size ?? PEN_SIZES[1]);
    resetViewRef.current();
    requestAnimationFrame(() => {
      resizeCanvasRef.current();
      flushRedrawRef.current();
    });
  }, [open, draftKey]);

  useEffect(() => {
    if (!open) return;
    const onMove = (e: PointerEvent) => {
      const drag = rulerDragRef.current;
      if (!drag) return;
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (drag.mode === "move") {
        setRulerCenter({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else if (drag.mode === "rotate" && drag.startAngle != null && drag.startPointerAngle != null) {
        const cx = rulerCenter.x + rect.left;
        const cy = rulerCenter.y + rect.top;
        const pointerAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
        setRulerAngle(drag.startAngle + (pointerAngle - drag.startPointerAngle));
      }
    };
    const onUp = () => {
      rulerDragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [open, rulerCenter.x, rulerCenter.y]);

  const flushPendingPersistence = useCallback(() => {
    clearTimers();
    if (strokesRef.current.length > 0 && !savedViaButtonRef.current) {
      persistDraft();
    }
    void flushAutosave();
  }, [clearTimers, flushAutosave, persistDraft]);

  useEffect(() => {
    if (!open) return;
    const onHide = () => {
      flushPendingPersistence();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      flushPendingPersistence();
    };
  }, [open, flushPendingPersistence]);

  const finalizeClose = useCallback(async () => {
    flushPendingPersistence();
    if (
      !savedViaButtonRef.current &&
      strokesRef.current.length > 0 &&
      onUnsavedExit
    ) {
      const file = await exportPngFile();
      if (file) {
        try {
          await onUnsavedExit(file);
        } catch (err) {
          console.warn("sketch unsaved exit failed", err);
        }
      }
    }
    savedViaButtonRef.current = false;
    onClose();
  }, [exportPngFile, flushPendingPersistence, onClose, onUnsavedExit]);

  const requestClose = useCallback(() => {
    void finalizeClose();
  }, [finalizeClose]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
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
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      p: normalizeInkPressure(e.pressure, e.pointerType),
    };
  };

  const maybeSnapPoint = useCallback(
    (pt: Point): Point => {
      if (!rulerVisible || !snapToRuler) return pt;
      return projectPointOntoRuler(pt.x, pt.y, rulerCenter.x, rulerCenter.y, rulerAngle);
    },
    [rulerVisible, snapToRuler, rulerCenter.x, rulerCenter.y, rulerAngle],
  );

  const resolveDrawTool = useCallback((): InkDrawTool => {
    if (tool === "ruler" || tool === "lasso") return lastDrawToolRef.current;
    return tool;
  }, [tool]);

  const handleToolChange = useCallback(
    (next: InkTool) => {
      if (next === "ruler") {
        if (rulerVisible) {
          setRulerVisible(false);
          setTool(lastDrawToolRef.current);
          return;
        }
        setRulerVisible(true);
        setTool("ruler");
        return;
      }
      setTool(next);
      if (next !== "lasso") {
        lastDrawToolRef.current = next;
        const preset = INK_TOOL_PRESETS[next];
        setSize(preset.defaultSize);
        if (preset.defaultColor) setColor(preset.defaultColor);
      }
    },
    [rulerVisible],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (e.pointerType === "pen") penSeenRef.current = true;

    if (
      palmRejectionRef.current &&
      penSeenRef.current &&
      e.pointerType === "touch"
    ) {
      e.preventDefault();
      return;
    }

    const pt = maybeSnapPoint(getPoint(canvas, e));

    if (tool === "ruler") {
      setRulerCenter({ x: pt.x, y: pt.y });
      setRulerVisible(true);
      e.preventDefault();
      return;
    }

    if (tool === "lasso") {
      lassoPointsRef.current = [pt];
      canvas.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      e.preventDefault();
      return;
    }

    if (activePointerIdRef.current != null) {
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
    const drawTool = resolveDrawTool();
    activeStrokeRef.current = {
      tool: drawTool,
      color: drawTool === "highlighter" ? color : color,
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

    if (tool === "lasso" && lassoPointsRef.current.length > 0) {
      const pt = maybeSnapPoint(getPoint(canvas, e));
      lassoPointsRef.current.push(pt);
      scheduleRedraw();
      e.preventDefault();
      return;
    }

    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    const events = typeof e.nativeEvent.getCoalescedEvents === "function"
      ? e.nativeEvent.getCoalescedEvents()
      : [];

    if (events.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const pointerType = e.pointerType;
      for (const ev of events) {
        const snapped = maybeSnapPoint({
          x: ev.clientX - rect.left,
          y: ev.clientY - rect.top,
          p: normalizeInkPressure(ev.pressure, ev.pointerType || pointerType),
        });
        stroke.points.push(snapped);
      }
    } else {
      stroke.points.push(maybeSnapPoint(getPoint(canvas, e)));
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
    if (tool === "lasso" && lassoPointsRef.current.length > 2) {
      const xs = lassoPointsRef.current.map((p) => p.x);
      const ys = lassoPointsRef.current.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      strokesRef.current = strokesRef.current.filter((s) => {
        const hit = s.points.some(
          (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY,
        );
        return !hit;
      });
      setHasStrokes(strokesRef.current.length > 0);
      lassoPointsRef.current = [];
      notifyStrokeChange();
      flushRedraw();
      e.preventDefault();
      return;
    }
    lassoPointsRef.current = [];

    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (stroke && stroke.points.length > 0) {
      strokesRef.current.push({ ...stroke, tool: normalizeInkDrawTool(stroke.tool) });
      setHasStrokes(true);
      notifyStrokeChange();
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
      notifyStrokeChange();
    }
  };

  const handleRedo = () => {
    const popped = redoStackRef.current.pop();
    if (popped) {
      strokesRef.current.push(popped);
      setHasStrokes(true);
      setRedoCount(redoStackRef.current.length);
      redraw();
      notifyStrokeChange();
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
    notifyStrokeChange();
  };

  const handleSave = async () => {
    if (!hasStrokes || saving) return;
    setSaving(true);
    try {
      const file = await exportPngFile();
      if (!file) throw new Error("Could not export handwritten note");
      savedViaButtonRef.current = true;
      await onSave(file);
      if (draftKey && clearDraftOnSave) clearSketchDraft(draftKey);
      await finalizeClose();
    } catch (err) {
      savedViaButtonRef.current = false;
      console.error("handwritten save error", err);
      window.alert(`Couldn't save handwritten note: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const touchDistance = (touches: React.TouchList | TouchList) => {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleWrapTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disableViewZoom) return;
    if (!e.touches || e.touches.length !== 2) return;
    const dist = touchDistance(e.touches);
    pinchRef.current = {
      dist,
      scale: viewScaleRef.current,
      panX: viewPanRef.current.x,
      panY: viewPanRef.current.y,
      midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
    e.preventDefault();
  };

  const handleWrapTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disableViewZoom) return;
    const pinch = pinchRef.current;
    if (!pinch || !e.touches || e.touches.length !== 2) return;
    const dist = touchDistance(e.touches);
    const nextScale = clampViewScale(pinch.scale * (dist / pinch.dist));
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    setViewScale(nextScale);
    setViewPan({
      x: pinch.panX + (midX - pinch.midX),
      y: pinch.panY + (midY - pinch.midY),
    });
    e.preventDefault();
  };

  const handleWrapTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disableViewZoom) return;
    if (!e.touches || e.touches.length < 2) pinchRef.current = null;
  };

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      role={isInline ? undefined : "dialog"}
      aria-modal={isInline ? undefined : true}
      aria-label={isInline ? undefined : "Handwritten"}
      className={cn(
        "flex select-none flex-col",
        isInline
          ? cn(
              "relative h-full min-h-0 w-full max-w-none flex-1",
              fullBleed ? "bg-white dark:bg-slate-950" : isNightMode ? "bg-white dark:bg-slate-950" : "bg-background",
            )
          : cn("fixed inset-0 z-[80]", isNightMode ? "dark bg-slate-950 text-slate-100" : "bg-background"),
      )}
      style={{
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        ...(isInline
          ? { touchAction: "none", overscrollBehavior: "none" }
          : {
              height: "100dvh",
              paddingBottom: "env(safe-area-inset-bottom)",
              touchAction: "none",
              overscrollBehavior: "none",
            }),
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header
        className={cn(
          "flex-shrink-0 border-b",
          edgeToEdgePaper ? "px-0" : isInline && fullBleed ? "px-2" : "px-3",
          isInline ? "pt-0" : "pt-[env(safe-area-inset-top,0px)]",
          isNightMode ? "border-white/10 bg-slate-950/95" : "border-border/50 bg-white/95",
        )}
      >
        <div className="flex h-11 items-center gap-2">
        <button
          type="button"
          onClick={requestClose}
          className={cn("rounded-full p-1.5 transition", isNightMode ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          title={isInline ? "Back to typed journal" : "Close handwritten"}
          aria-label={isInline ? "Back to typed journal" : "Close handwritten"}
        >
          {isInline ? <Keyboard className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
        <div
          className={cn(
            "min-w-0 flex-1 truncate text-center text-[13px] font-medium",
            isNightMode ? "text-slate-300" : "text-muted-foreground",
          )}
        >
          {isInline ? inlineTitle?.trim() || "Handwritten" : "Handwritten"}
        </div>
        {showNewPage && onNewPage ? (
          <Button
            type="button"
            onClick={onNewPage}
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 shrink-0 rounded-full px-2.5 text-[12px] font-medium",
              isNightMode
                ? "text-slate-300 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            New page
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasStrokes || saving}
          size="sm"
          variant="ghost"
          className={cn("h-8 shrink-0 rounded-full px-3 text-[13px] font-medium", isNightMode ? "text-sky-300 hover:bg-sky-400/10 hover:text-sky-200 disabled:text-slate-500" : "text-blue-600 hover:bg-blue-50 hover:text-blue-700 disabled:text-muted-foreground")}
        >
          {saving ? (
            "Saving…"
          ) : (
            <>
              <span className={isInline || tabletPortrait ? "inline" : "hidden sm:inline"}>Save handwritten</span>
              <span className={isInline || tabletPortrait ? "hidden" : "sm:hidden"}>Save</span>
            </>
          )}
        </Button>
        </div>
      </header>

      <input
        ref={customColorRef}
        type="color"
        className="sr-only"
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          if (tool === "eraser") handleToolChange("fountain");
        }}
        aria-hidden
        tabIndex={-1}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <SketchInkToolbar
          isNightMode={isNightMode}
          collapsed={toolbarCollapsed}
          onCollapsedChange={setToolbarCollapsed}
          tabletPortrait={tabletPortrait}
          tool={tool}
          color={color}
          size={size}
          penColors={penColors}
          paper={paper}
          hasStrokes={hasStrokes}
          redoCount={redoCount}
          drawWithFinger={drawWithFinger}
          rulerVisible={rulerVisible}
          snapToRuler={snapToRuler}
          onToolChange={handleToolChange}
          onColorChange={(c) => {
            setColor(c);
            if (tool === "eraser") handleToolChange("fountain");
            else if (tool === "lasso") setTool(lastDrawToolRef.current);
          }}
          onSizeChange={setSize}
          onPaperChange={handlePaperChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onDrawWithFingerChange={(v) => setPalmRejection(!v)}
          onSnapToRulerChange={setSnapToRuler}
          customColorInputRef={customColorRef}
        />

        {/* Canvas — pill floats over top edge via negative margin */}
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col",
            toolbarCollapsed ? "-mt-14 pt-14" : "-mt-[3.5rem] pt-[4.5rem]",
            edgeToEdgePaper ? "px-0 pb-0" : tabletPortrait ? "px-3 pb-3" : "px-1.5 pb-1.5 sm:px-3 sm:pb-3",
            isNightMode ? "bg-black" : edgeToEdgePaper ? "bg-white" : "bg-muted/40",
          )}
        >
        <div
          ref={wrapperRef}
          className={cn(
            "relative h-full w-full overflow-hidden",
            edgeToEdgePaper
              ? "rounded-none border-0 shadow-none"
              : "rounded-lg border shadow-sm sm:rounded-xl",
            isNightMode ? "bg-black" : "bg-white",
            !edgeToEdgePaper && (isNightMode ? "border-white/10" : "border-border/60"),
          )}
          style={{
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            touchAction: "none",
            overscrollBehavior: "none",
          }}
          onTouchStart={handleWrapTouchStart}
          onTouchMove={handleWrapTouchMove}
          onTouchEnd={handleWrapTouchEnd}
          onTouchCancel={handleWrapTouchEnd}
        >
          <div
            ref={transformRef}
            className="relative h-full w-full"
            style={{
              transform: `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewScale})`,
              transformOrigin: "0 0",
            }}
          >
            <SketchRulerOverlay
              visible={rulerVisible}
              centerX={rulerCenter.x}
              centerY={rulerCenter.y}
              angleDeg={rulerAngle}
              lengthPx={rulerLength}
              isNightMode={isNightMode}
              onPointerDown={(e) => {
                const wrap = wrapperRef.current;
                if (!wrap) return;
                const rect = wrap.getBoundingClientRect();
                rulerDragRef.current = { mode: "move" };
                setRulerCenter({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
                e.preventDefault();
              }}
              onRotatePointerDown={(e) => {
                const wrap = wrapperRef.current;
                if (!wrap) return;
                const rect = wrap.getBoundingClientRect();
                const cx = rulerCenter.x + rect.left;
                const cy = rulerCenter.y + rect.top;
                const pointerAngle =
                  (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
                rulerDragRef.current = {
                  mode: "rotate",
                  startAngle: rulerAngle,
                  startPointerAngle: pointerAngle,
                };
                e.preventDefault();
              }}
            />
            <canvas
              ref={canvasRef}
              className="block h-full w-full touch-none select-none"
              style={{
                touchAction: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
                cursor:
                  tool === "eraser"
                    ? "cell"
                    : tool === "lasso"
                      ? "crosshair"
                      : tool === "ruler"
                        ? "grab"
                        : "crosshair",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>
        </div>
        </div>
      </div>

      {!isInline ? (
      <footer className={cn("hidden flex-shrink-0 items-center justify-between gap-3 border-t px-4 py-2 text-[11px]", !tabletPortrait && "sm:flex", isNightMode ? "border-white/10 bg-slate-950/90 text-slate-400" : "border-border/50 bg-white/90 text-muted-foreground")}>
        <span className="inline-flex items-center gap-1">
          <Trash2 className="h-3 w-3" />
          {draftKey || onUnsavedExit
            ? "Your strokes are kept — use Save handwritten to attach, or reopen to continue drawing"
            : "Closing without saving discards the handwritten note"}
        </span>
        <span className="hidden sm:inline tabular-nums">
          Ctrl/⌘ Z undo · ⇧ Ctrl/⌘ Z redo · After save, this can be transcribed into your entry
        </span>
      </footer>
      ) : null}
    </div>
  );
}
