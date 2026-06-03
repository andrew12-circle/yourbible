import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  eraserRadiusFromSize,
  filterStrokesByEraser,
} from "@/lib/ink/eraser";
import {
  drawStroke,
  getInkPointFromCanvasEvent,
} from "@/lib/ink/strokeRender";
import { normalizeInkDrawTool } from "@/lib/ink/toolPresets";
import type { InkPoint, InkStroke, InkTool, ReaderPageInkKey } from "@/lib/ink/types";
import { useReaderPageInk } from "@/hooks/useReaderPageInk";
import { cn } from "@/lib/utils";

export type ReaderInkLayerState = {
  canUndo: boolean;
  canRedo: boolean;
  redoCount: number;
};

export type ReaderInkClearOptions = { skipConfirm?: boolean };

export type ReaderInkLayerApi = {
  undo: () => void;
  redo: () => void;
  clear: (options?: ReaderInkClearOptions) => void;
  getState: () => ReaderInkLayerState;
};

type OverlayLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Props = {
  layerId: string;
  /** Allow drawing and erasing (pen mode). Ink stays visible when false. */
  interactive: boolean;
  /** Reading-area element used to position the fixed ink overlay. */
  getAnchorEl: () => HTMLElement | null;
  userId: string | undefined;
  pageKey: ReaderPageInkKey;
  layoutFingerprint: string;
  anchorVerse: number | null;
  tool: InkTool;
  color: string;
  size: number;
  className?: string;
  onFocus?: (layerId: string) => void;
  onRegister?: (layerId: string, api: ReaderInkLayerApi) => void;
  onUnregister?: (layerId: string) => void;
  onStateChange?: (layerId: string, state: ReaderInkLayerState) => void;
  onStaleLayout?: (hasStale: boolean) => void;
  /** Collapse the floating ink toolbar when the user starts a stroke. */
  onStrokeStart?: () => void;
};

const EMPTY_LAYOUT: OverlayLayout = { left: 0, top: 0, width: 0, height: 0 };

export default function ReaderInkLayer({
  layerId,
  interactive,
  getAnchorEl,
  userId,
  pageKey,
  layoutFingerprint,
  anchorVerse,
  tool,
  color,
  size,
  className,
  onFocus,
  onRegister,
  onUnregister,
  onStateChange,
  onStaleLayout,
  onStrokeStart,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokeLayerRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const redrawFrameRef = useRef<number | null>(null);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const lassoPointsRef = useRef<InkPoint[]>([]);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);
  /** Committed strokes for immediate canvas redraw (React state can lag one frame). */
  const displayStrokesRef = useRef<InkStroke[]>([]);
  const toolRef = useRef({ tool, color, size });
  toolRef.current = { tool, color, size };

  const getAnchorElRef = useRef(getAnchorEl);
  getAnchorElRef.current = getAnchorEl;

  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [overlayLayout, setOverlayLayout] = useState<OverlayLayout>(EMPTY_LAYOUT);

  const {
    strokes,
    redoStack,
    staleFingerprint,
    pushStroke,
    undo,
    redo,
    clearAll,
    setStrokes,
  } = useReaderPageInk({
    userId,
    pageKey,
    layoutFingerprint,
    anchorVerse,
    canvasSize,
    liveCanvasSizeRef: sizeRef,
    enabled: true,
  });

  const pushStrokeRef = useRef(pushStroke);
  pushStrokeRef.current = pushStroke;
  const setStrokesRef = useRef(setStrokes);
  setStrokesRef.current = setStrokes;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onStrokeStartRef = useRef(onStrokeStart);
  onStrokeStartRef.current = onStrokeStart;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const onStaleLayoutRef = useRef(onStaleLayout);
  onStaleLayoutRef.current = onStaleLayout;
  const onRegisterRef = useRef(onRegister);
  onRegisterRef.current = onRegister;
  const onUnregisterRef = useRef(onUnregister);
  onUnregisterRef.current = onUnregister;
  const lastNotifiedStateRef = useRef<ReaderInkLayerState | null>(null);
  const flushRedrawRef = useRef<() => void>(() => {});
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const pendingCommitCountRef = useRef(0);
  const layerIdRef = useRef(layerId);
  layerIdRef.current = layerId;

  useEffect(() => {
    if (strokes.length === 0) {
      if (displayStrokesRef.current.length === 0 || pendingCommitCountRef.current > 0) return;
      displayStrokesRef.current = strokes;
      flushRedrawRef.current();
      return;
    }
    if (strokes.length < displayStrokesRef.current.length) {
      if (pendingCommitCountRef.current > 0) return;
      displayStrokesRef.current = strokes;
      flushRedrawRef.current();
      return;
    }
    if (strokes.length > displayStrokesRef.current.length) {
      pendingCommitCountRef.current = 0;
      displayStrokesRef.current = strokes;
      flushRedrawRef.current();
      return;
    }
    if (
      strokes.length === displayStrokesRef.current.length &&
      pendingCommitCountRef.current > 0
    ) {
      pendingCommitCountRef.current = 0;
      if (strokes.length > 0) {
        displayStrokesRef.current = strokes;
        flushRedrawRef.current();
      }
      return;
    }
  }, [strokes]);

  useEffect(() => {
    if (!staleFingerprint) return;
    onStaleLayoutRef.current?.(true);
  }, [staleFingerprint]);

  useEffect(() => {
    const next: ReaderInkLayerState = {
      canUndo: strokes.length > 0,
      canRedo: redoStack.length > 0,
      redoCount: redoStack.length,
    };
    const prev = lastNotifiedStateRef.current;
    if (
      prev &&
      prev.canUndo === next.canUndo &&
      prev.canRedo === next.canRedo &&
      prev.redoCount === next.redoCount
    ) {
      return;
    }
    lastNotifiedStateRef.current = next;
    onStateChangeRef.current?.(layerId, next);
  }, [layerId, strokes.length, redoStack.length]);

  useEffect(() => {
    lastNotifiedStateRef.current = null;
  }, [layerId]);

  useEffect(() => {
    const api: ReaderInkLayerApi = {
      undo,
      redo,
      clear: (options) => {
        if (strokes.length === 0 && displayStrokesRef.current.length === 0) return;
        if (!options?.skipConfirm && !window.confirm("Clear ink on this page?")) return;
        displayStrokesRef.current = [];
        pendingCommitCountRef.current = 0;
        lassoPointsRef.current = [];
        activeStrokeRef.current = null;
        clearAll();
        flushRedrawRef.current();
      },
      getState: () => ({
        canUndo: strokes.length > 0,
        canRedo: redoStack.length > 0,
        redoCount: redoStack.length,
      }),
    };
    onRegisterRef.current?.(layerId, api);
    return () => onUnregisterRef.current?.(layerId);
  }, [layerId, undo, redo, clearAll, strokes.length, redoStack.length]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    const { w, h } = sizeRef.current;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.restore();

    const layer = strokeLayerRef.current;
    if (!layer) return;
    const lctx = layer.getContext("2d");
    if (!lctx) return;
    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, layer.width, layer.height);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const stroke of displayStrokesRef.current) {
      drawStroke(lctx, stroke);
    }
    const activeStroke = activeStrokeRef.current;
    if (activeStroke && activeStroke.tool !== "eraser") {
      drawStroke(lctx, activeStroke);
    }
    if (activeStroke?.tool === "eraser" && activeStroke.points.length > 0) {
      const r = eraserRadiusFromSize(toolRef.current.size);
      const last = activeStroke.points[activeStroke.points.length - 1]!;
      lctx.beginPath();
      lctx.arc(last.x, last.y, r, 0, Math.PI * 2);
      lctx.fillStyle = "rgba(15, 23, 42, 0.1)";
      lctx.fill();
      lctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
      lctx.lineWidth = 1.5;
      lctx.stroke();
    }
    const lassoPts = lassoPointsRef.current;
    if (lassoPts.length > 1) {
      lctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
      lctx.lineWidth = 1.5;
      lctx.setLineDash([5, 4]);
      lctx.lineJoin = "round";
      lctx.lineCap = "round";
      lctx.beginPath();
      lctx.moveTo(lassoPts[0]!.x, lassoPts[0]!.y);
      for (let i = 1; i < lassoPts.length; i++) {
        lctx.lineTo(lassoPts[i]!.x, lassoPts[i]!.y);
      }
      lctx.stroke();
      lctx.setLineDash([]);
    }
    lctx.restore();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }, []);

  const flushRedraw = useCallback(() => {
    if (redrawFrameRef.current != null) {
      window.cancelAnimationFrame(redrawFrameRef.current);
      redrawFrameRef.current = null;
    }
    redraw();
  }, [redraw]);

  flushRedrawRef.current = flushRedraw;

  const detachPointerHandlers = useCallback(() => {
    pointerCleanupRef.current?.();
    pointerCleanupRef.current = null;
  }, []);

  const attachPointerHandlers = useCallback(() => {
    if (!interactive || pointerCleanupRef.current) return;
    const wrap = wrapRef.current;
    if (!wrap || sizeRef.current.w <= 0 || sizeRef.current.h <= 0) return;

    const resolveDrawToolLocal = () => {
      const t = toolRef.current.tool;
      if (t === "ruler") return "fountain";
      return normalizeInkDrawTool(t);
    };

    const applyEraserToStrokes = (eraserPoints: InkPoint[]) => {
      if (eraserPoints.length === 0) return;
      const size = toolRef.current.size;
      setStrokesRef.current((prev) => {
        const next = filterStrokesByEraser(prev, eraserPoints, size);
        if (next.length === prev.length) return prev;
        displayStrokesRef.current = next;
        pendingCommitCountRef.current = 0;
        return next;
      });
    };

    const deleteStrokesInLassoBounds = () => {
      const pts = lassoPointsRef.current;
      if (pts.length < 3) return;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      setStrokesRef.current((prev) => {
        const next = prev.filter(
          (s) =>
            !s.points.some(
              (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY,
            ),
        );
        displayStrokesRef.current = next;
        pendingCommitCountRef.current = 0;
        return next;
      });
    };

    const commitStroke = (stroke: InkStroke) => {
      const committed: InkStroke = {
        ...stroke,
        tool: normalizeInkDrawTool(stroke.tool),
        points: stroke.points.map((p) => ({ ...p })),
      };
      pendingCommitCountRef.current += 1;
      displayStrokesRef.current = [...displayStrokesRef.current, committed];
      pushStrokeRef.current(committed);
      flushRedrawRef.current();
      window.requestAnimationFrame(() => {
        onStrokeStartRef.current?.();
      });
    };

    const finishStroke = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      try {
        wrap.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      activePointerIdRef.current = null;
      activePointerTypeRef.current = null;

      if (toolRef.current.tool === "lasso") {
        deleteStrokesInLassoBounds();
        lassoPointsRef.current = [];
        flushRedrawRef.current();
        e.preventDefault();
        return;
      }

      const stroke = activeStrokeRef.current;
      activeStrokeRef.current = null;
      if (stroke?.tool === "eraser" && stroke.points.length > 0) {
        applyEraserToStrokes(stroke.points);
        flushRedrawRef.current();
        e.preventDefault();
        return;
      }
      if (stroke && stroke.points.length > 0) {
        commitStroke(stroke);
      } else {
        flushRedrawRef.current();
      }
      e.preventDefault();
    };

    const onPointerDown = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      const { w, h } = sizeRef.current;
      if (!canvas || w <= 0 || h <= 0) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      onFocusRef.current?.(layerIdRef.current);

      if (activePointerIdRef.current != null) {
        const takeover = e.pointerType === "pen" && activePointerTypeRef.current === "touch";
        if (!takeover) return;
        try {
          wrap.releasePointerCapture(activePointerIdRef.current);
        } catch {
          /* noop */
        }
        activeStrokeRef.current = null;
      }

      wrap.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      activePointerTypeRef.current = e.pointerType;
      const pt = getInkPointFromCanvasEvent(canvas, e.clientX, e.clientY, e.pressure, e.pointerType);

      if (toolRef.current.tool === "lasso") {
        lassoPointsRef.current = [pt];
        activeStrokeRef.current = null;
        flushRedrawRef.current();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const { color: c, size: s } = toolRef.current;
      if (toolRef.current.tool === "eraser") {
        activeStrokeRef.current = { tool: "eraser", color: c, size: s, points: [pt] };
        flushRedrawRef.current();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const drawTool = resolveDrawToolLocal();
      activeStrokeRef.current = { tool: drawTool, color: c, size: s, points: [pt] };
      flushRedrawRef.current();
      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (toolRef.current.tool === "lasso" && lassoPointsRef.current.length > 0) {
        const coalesced =
          typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
        if (coalesced.length > 0) {
          for (const ev of coalesced) {
            lassoPointsRef.current.push(
              getInkPointFromCanvasEvent(canvas, ev.clientX, ev.clientY, ev.pressure, e.pointerType),
            );
          }
        } else {
          lassoPointsRef.current.push(
            getInkPointFromCanvasEvent(canvas, e.clientX, e.clientY, e.pressure, e.pointerType),
          );
        }
        if (redrawFrameRef.current == null) {
          redrawFrameRef.current = window.requestAnimationFrame(() => {
            redrawFrameRef.current = null;
            flushRedrawRef.current();
          });
        }
        e.preventDefault();
        return;
      }

      if (toolRef.current.tool === "eraser") {
        const stroke = activeStrokeRef.current;
        if (!stroke || stroke.tool !== "eraser") return;
        const coalesced =
          typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
        if (coalesced.length > 0) {
          for (const ev of coalesced) {
            stroke.points.push(
              getInkPointFromCanvasEvent(canvas, ev.clientX, ev.clientY, ev.pressure, e.pointerType),
            );
          }
        } else {
          stroke.points.push(
            getInkPointFromCanvasEvent(canvas, e.clientX, e.clientY, e.pressure, e.pointerType),
          );
        }
        if (stroke.points.length >= 2) {
          applyEraserToStrokes(stroke.points);
        }
        if (redrawFrameRef.current == null) {
          redrawFrameRef.current = window.requestAnimationFrame(() => {
            redrawFrameRef.current = null;
            flushRedrawRef.current();
          });
        }
        e.preventDefault();
        return;
      }

      const stroke = activeStrokeRef.current;
      if (!stroke) return;
      const coalesced =
        typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
      if (coalesced.length > 0) {
        for (const ev of coalesced) {
          stroke.points.push(
            getInkPointFromCanvasEvent(canvas, ev.clientX, ev.clientY, ev.pressure, e.pointerType),
          );
        }
      } else {
        stroke.points.push(
          getInkPointFromCanvasEvent(canvas, e.clientX, e.clientY, e.pressure, e.pointerType),
        );
      }
      if (redrawFrameRef.current == null) {
        redrawFrameRef.current = window.requestAnimationFrame(() => {
          redrawFrameRef.current = null;
          flushRedrawRef.current();
        });
      }
      e.preventDefault();
    };

    const preventDefault = (e: Event) => e.preventDefault();
    const nonPassive = { passive: false } as AddEventListenerOptions;

    const onPointerDownWithSelectionClear = (e: PointerEvent) => {
      window.getSelection()?.removeAllRanges();
      onPointerDown(e);
    };

    wrap.addEventListener("pointerdown", onPointerDownWithSelectionClear, nonPassive);
    wrap.addEventListener("pointermove", onPointerMove, nonPassive);
    wrap.addEventListener("pointerup", finishStroke, nonPassive);
    wrap.addEventListener("pointercancel", finishStroke, nonPassive);
    wrap.addEventListener("touchstart", preventDefault, nonPassive);
    wrap.addEventListener("touchmove", preventDefault, nonPassive);
    wrap.addEventListener("contextmenu", preventDefault);
    wrap.addEventListener("selectstart", preventDefault, nonPassive);
    wrap.addEventListener("dragstart", preventDefault);
    window.addEventListener("pointerup", finishStroke, nonPassive);
    window.addEventListener("pointercancel", finishStroke, nonPassive);

    pointerCleanupRef.current = () => {
      wrap.removeEventListener("pointerdown", onPointerDownWithSelectionClear);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", finishStroke);
      wrap.removeEventListener("pointercancel", finishStroke);
      wrap.removeEventListener("touchstart", preventDefault);
      wrap.removeEventListener("touchmove", preventDefault);
      wrap.removeEventListener("contextmenu", preventDefault);
      wrap.removeEventListener("selectstart", preventDefault);
      wrap.removeEventListener("dragstart", preventDefault);
      window.removeEventListener("pointerup", finishStroke);
      window.removeEventListener("pointercancel", finishStroke);
      activePointerIdRef.current = null;
      activeStrokeRef.current = null;
      lassoPointsRef.current = [];
    };
  }, [interactive]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;
    const prev = sizeRef.current;
    if (prev.w === w && prev.h === h && canvas.width > 0) {
      attachPointerHandlers();
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    dprRef.current = dpr;
    sizeRef.current = { w, h };
    setCanvasSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    if (!strokeLayerRef.current) {
      strokeLayerRef.current = document.createElement("canvas");
    }
    const layer = strokeLayerRef.current;
    layer.width = canvas.width;
    layer.height = canvas.height;
    flushRedraw();
    attachPointerHandlers();
  }, [attachPointerHandlers, flushRedraw]);

  const syncOverlayLayoutRef = useRef<() => void>(() => {});
  const overlayLayoutRafRef = useRef<number | null>(null);

  const syncOverlayLayout = useCallback(() => {
    const anchor = getAnchorElRef.current();
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const left = Math.round(r.left);
    const top = Math.round(r.top);
    const width = Math.max(0, Math.round(r.width));
    const height = Math.max(0, Math.round(r.height));
    setOverlayLayout((prev) =>
      prev.left === left &&
      prev.top === top &&
      prev.width === width &&
      prev.height === height
        ? prev
        : { left, top, width, height },
    );
  }, []);

  syncOverlayLayoutRef.current = syncOverlayLayout;

  const scheduleSyncOverlayLayout = useCallback(() => {
    if (overlayLayoutRafRef.current != null) return;
    overlayLayoutRafRef.current = window.requestAnimationFrame(() => {
      overlayLayoutRafRef.current = null;
      syncOverlayLayoutRef.current();
    });
  }, []);

  useEffect(() => {
    syncOverlayLayout();
    const anchor = getAnchorElRef.current();
    const ro = anchor ? new ResizeObserver(() => scheduleSyncOverlayLayout()) : null;
    if (anchor && ro) ro.observe(anchor);
    const onLayoutChange = () => scheduleSyncOverlayLayout();
    const onResize = () => scheduleSyncOverlayLayout();
    window.addEventListener("resize", onResize);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onLayoutChange);
    vv?.addEventListener("scroll", onLayoutChange);
    const raf = window.requestAnimationFrame(syncOverlayLayout);
    return () => {
      window.cancelAnimationFrame(raf);
      if (overlayLayoutRafRef.current != null) {
        window.cancelAnimationFrame(overlayLayoutRafRef.current);
        overlayLayoutRafRef.current = null;
      }
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onLayoutChange);
      vv?.removeEventListener("scroll", onLayoutChange);
    };
  }, [syncOverlayLayout, scheduleSyncOverlayLayout, layerId]);

  useLayoutEffect(() => {
    if (overlayLayout.width <= 0 || overlayLayout.height <= 0) return;
    resizeCanvas();
  }, [overlayLayout.width, overlayLayout.height, resizeCanvas]);

  useLayoutEffect(() => {
    attachPointerHandlers();
    return detachPointerHandlers;
  }, [interactive, layerId, attachPointerHandlers, detachPointerHandlers]);

  if (overlayLayout.width <= 0 || overlayLayout.height <= 0) return null;

  const overlay = (
    <div
      ref={wrapRef}
      className={cn(
        "fixed select-none",
        interactive ? "touch-none" : "pointer-events-none touch-none",
        className,
      )}
      data-reader-ink-layer={layerId}
      style={{
        left: overlayLayout.left,
        top: overlayLayout.top,
        width: overlayLayout.width,
        height: overlayLayout.height,
        zIndex: interactive ? 40 : 15,
        touchAction: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      aria-label={interactive ? "Ink layer — draw on this page" : "Handwritten notes on this page"}
      aria-hidden={!interactive && strokes.length === 0 ? true : undefined}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ touchAction: "none" }}
        aria-hidden
      />
    </div>
  );

  return createPortal(overlay, document.body);
}
