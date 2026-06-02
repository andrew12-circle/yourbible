import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  drawStroke,
  getInkPointFromCanvasEvent,
} from "@/lib/ink/strokeRender";
import { normalizeInkDrawTool } from "@/lib/ink/toolPresets";
import type { InkStroke, InkTool, ReaderPageInkKey } from "@/lib/ink/types";
import { useReaderPageInk } from "@/hooks/useReaderPageInk";
import { cn } from "@/lib/utils";

export type ReaderInkLayerState = {
  canUndo: boolean;
  canRedo: boolean;
  redoCount: number;
};

export type ReaderInkLayerApi = {
  undo: () => void;
  redo: () => void;
  clear: () => void;
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
  active: boolean;
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
};

const EMPTY_LAYOUT: OverlayLayout = { left: 0, top: 0, width: 0, height: 0 };

export default function ReaderInkLayer({
  layerId,
  active,
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
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokeLayerRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const redrawFrameRef = useRef<number | null>(null);
  const activeStrokeRef = useRef<InkStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);
  const toolRef = useRef({ tool, color, size });
  toolRef.current = { tool, color, size };

  const getAnchorElRef = useRef(getAnchorEl);
  getAnchorElRef.current = getAnchorEl;

  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [overlayLayout, setOverlayLayout] = useState<OverlayLayout>(EMPTY_LAYOUT);

  const {
    strokes,
    redoStack,
    loading,
    staleFingerprint,
    pushStroke,
    undo,
    redo,
    clearAll,
  } = useReaderPageInk({
    userId,
    pageKey,
    layoutFingerprint,
    anchorVerse,
    canvasSize,
    liveCanvasSizeRef: sizeRef,
    enabled: active,
  });

  const pushStrokeRef = useRef(pushStroke);
  pushStrokeRef.current = pushStroke;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const flushRedrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) return;
    activePointerIdRef.current = null;
    activeStrokeRef.current = null;
  }, [active, layerId]);

  useEffect(() => {
    onStaleLayout?.(Boolean(staleFingerprint));
  }, [staleFingerprint, onStaleLayout]);

  useEffect(() => {
    onStateChange?.(layerId, {
      canUndo: strokes.length > 0,
      canRedo: redoStack.length > 0,
      redoCount: redoStack.length,
    });
  }, [layerId, strokes.length, redoStack.length, onStateChange]);

  useEffect(() => {
    const api: ReaderInkLayerApi = {
      undo,
      redo,
      clear: () => {
        if (strokes.length === 0) return;
        if (window.confirm("Clear ink on this page?")) clearAll();
      },
      getState: () => ({
        canUndo: strokes.length > 0,
        canRedo: redoStack.length > 0,
        redoCount: redoStack.length,
      }),
    };
    onRegister?.(layerId, api);
    return () => onUnregister?.(layerId);
  }, [layerId, undo, redo, clearAll, strokes.length, redoStack.length, onRegister, onUnregister]);

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
    for (const stroke of strokes) {
      drawStroke(lctx, stroke);
    }
    if (activeStrokeRef.current) {
      drawStroke(lctx, activeStrokeRef.current);
    }
    lctx.restore();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }, [strokes]);

  const flushRedraw = useCallback(() => {
    if (redrawFrameRef.current != null) {
      window.cancelAnimationFrame(redrawFrameRef.current);
      redrawFrameRef.current = null;
    }
    redraw();
  }, [redraw]);

  flushRedrawRef.current = flushRedraw;

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    dprRef.current = dpr;
    sizeRef.current = { w, h };
    setCanvasSize({ w, h });
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
  }, [flushRedraw]);

  const syncOverlayLayout = useCallback(() => {
    const anchor = getAnchorElRef.current();
    if (!anchor) {
      setOverlayLayout(EMPTY_LAYOUT);
      sizeRef.current = { w: 0, h: 0 };
      return;
    }
    const r = anchor.getBoundingClientRect();
    const width = Math.max(0, Math.round(r.width));
    const height = Math.max(0, Math.round(r.height));
    setOverlayLayout({
      left: r.left,
      top: r.top,
      width,
      height,
    });
  }, []);

  useEffect(() => {
    if (!active) {
      setOverlayLayout(EMPTY_LAYOUT);
      return;
    }
    syncOverlayLayout();
    const anchor = getAnchorElRef.current();
    const ro = anchor ? new ResizeObserver(() => syncOverlayLayout()) : null;
    if (anchor && ro) ro.observe(anchor);
    const onScroll = () => syncOverlayLayout();
    const onResize = () => syncOverlayLayout();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    const raf = window.requestAnimationFrame(syncOverlayLayout);
    return () => {
      window.cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [active, syncOverlayLayout, layerId]);

  useEffect(() => {
    if (!active || overlayLayout.width <= 0 || overlayLayout.height <= 0) return;
    const raf = window.requestAnimationFrame(() => resizeCanvas());
    return () => window.cancelAnimationFrame(raf);
  }, [active, overlayLayout.width, overlayLayout.height, resizeCanvas]);

  useEffect(() => {
    flushRedraw();
  }, [strokes, loading, flushRedraw]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !active) return;

    const resolveDrawToolLocal = () => {
      const t = toolRef.current.tool;
      if (t === "ruler" || t === "lasso") return "fountain";
      return normalizeInkDrawTool(t);
    };

    const onPointerDown = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      const { w, h } = sizeRef.current;
      if (!canvas || w <= 0 || h <= 0) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      onFocusRef.current?.(layerId);

      if (activePointerIdRef.current != null) {
        const takeover = e.pointerType === "pen" && activePointerTypeRef.current === "touch";
        if (!takeover) return;
        try {
          canvas.releasePointerCapture(activePointerIdRef.current);
        } catch {
          /* noop */
        }
        activeStrokeRef.current = null;
      }

      wrap.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      activePointerTypeRef.current = e.pointerType;
      const { color: c, size: s } = toolRef.current;
      const drawTool = resolveDrawToolLocal();
      const pt = getInkPointFromCanvasEvent(canvas, e.clientX, e.clientY, e.pressure, e.pointerType);
      activeStrokeRef.current = { tool: drawTool, color: c, size: s, points: [pt] };
      flushRedrawRef.current();
      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      const canvas = canvasRef.current;
      const stroke = activeStrokeRef.current;
      if (!canvas || !stroke) return;
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

    const finishStroke = (e: PointerEvent) => {
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
        pushStrokeRef.current(stroke);
      } else {
        flushRedrawRef.current();
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

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDownWithSelectionClear);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", finishStroke);
      wrap.removeEventListener("pointercancel", finishStroke);
      wrap.removeEventListener("touchstart", preventDefault);
      wrap.removeEventListener("touchmove", preventDefault);
      wrap.removeEventListener("contextmenu", preventDefault);
      wrap.removeEventListener("selectstart", preventDefault);
      wrap.removeEventListener("dragstart", preventDefault);
    };
  }, [active, layerId]);

  if (!active || overlayLayout.width <= 0 || overlayLayout.height <= 0) return null;

  const overlay = (
    <div
      ref={wrapRef}
      className={cn(
        "fixed touch-none select-none",
        className,
      )}
      data-reader-ink-layer={layerId}
      style={{
        left: overlayLayout.left,
        top: overlayLayout.top,
        width: overlayLayout.width,
        height: overlayLayout.height,
        zIndex: 32,
        touchAction: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      aria-label="Ink layer — draw on this page"
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
