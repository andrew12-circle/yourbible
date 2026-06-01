import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  drawStroke,
  getInkPointFromCanvasEvent,
} from "@/lib/ink/strokeRender";
import type { InkStroke, InkTool, ReaderPageInkKey } from "@/lib/ink/types";
import { useReaderPageInk } from "@/hooks/useReaderPageInk";
import { cn } from "@/lib/utils";

export type ReaderInkLayerApi = {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  getState: () => { canUndo: boolean; canRedo: boolean };
};

type Props = {
  layerId: string;
  active: boolean;
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
  onStateChange?: (layerId: string, state: { canUndo: boolean; canRedo: boolean }) => void;
  onStaleLayout?: (hasStale: boolean) => void;
};

export default function ReaderInkLayer({
  layerId,
  active,
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
  const penSeenRef = useRef(false);
  const palmRejectionRef = useRef(true);
  const toolRef = useRef({ tool, color, size });
  toolRef.current = { tool, color, size };

  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

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
    enabled: active,
  });

  useEffect(() => {
    onStaleLayout?.(Boolean(staleFingerprint));
  }, [staleFingerprint, onStaleLayout]);

  useEffect(() => {
    onStateChange?.(layerId, {
      canUndo: strokes.length > 0,
      canRedo: redoStack.length > 0,
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
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    dprRef.current = dpr;
    sizeRef.current = { w: rect.width, h: rect.height };
    setCanvasSize({ w: rect.width, h: rect.height });
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
  }, [flushRedraw, setCanvasSize]);

  useEffect(() => {
    if (!active) return;
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    const wrap = wrapRef.current;
    if (wrap) ro.observe(wrap);
    const raf = window.requestAnimationFrame(() => resizeCanvas());
    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, resizeCanvas]);

  useEffect(() => {
    flushRedraw();
  }, [strokes, loading, flushRedraw]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const preventDefault = (event: Event) => event.preventDefault();
    const nonPassive = { passive: false } as AddEventListenerOptions;
    const surfaces = [wrap, canvas].filter(Boolean) as HTMLElement[];
    for (const el of surfaces) {
      el.addEventListener("touchstart", preventDefault, nonPassive);
      el.addEventListener("touchmove", preventDefault, nonPassive);
      el.addEventListener("contextmenu", preventDefault);
    }
    return () => {
      for (const el of surfaces) {
        el.removeEventListener("touchstart", preventDefault);
        el.removeEventListener("touchmove", preventDefault);
        el.removeEventListener("contextmenu", preventDefault);
      }
    };
  }, [active]);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !active || canvasSize.w <= 0 || canvasSize.h <= 0) return;
    onFocus?.(layerId);
    if (e.pointerType === "pen") penSeenRef.current = true;
    if (palmRejectionRef.current && penSeenRef.current && e.pointerType === "touch") {
      e.preventDefault();
      return;
    }
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
    canvas.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;
    const { tool: t, color: c, size: s } = toolRef.current;
    const pt = getInkPointFromCanvasEvent(canvas, e.clientX, e.clientY, e.pressure, e.pointerType);
    activeStrokeRef.current = { tool: t, color: c, size: s, points: [pt] };
    flushRedraw();
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const canvas = canvasRef.current;
    const stroke = activeStrokeRef.current;
    if (!canvas || !stroke) return;
    const events =
      typeof e.nativeEvent.getCoalescedEvents === "function"
        ? e.nativeEvent.getCoalescedEvents()
        : [];
    if (events.length > 0) {
      for (const ev of events) {
        stroke.points.push(
          getInkPointFromCanvasEvent(canvas, ev.clientX, ev.clientY, ev.pressure, e.pointerType),
        );
      }
    } else {
      stroke.points.push(
        getInkPointFromCanvasEvent(canvas, e.clientX, e.clientY, e.pressure, e.pointerType),
      );
    }
    scheduleRedraw();
    e.preventDefault();
  };

  const finishStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
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
      pushStroke(stroke);
    } else {
      flushRedraw();
    }
    e.preventDefault();
  };

  if (!active) return null;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "pointer-events-auto absolute inset-0 z-[25] touch-none select-none",
        className,
      )}
      data-reader-ink-layer={layerId}
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ touchAction: "none" }}
        aria-label="Ink layer — draw on this page"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />
    </div>
  );
}
