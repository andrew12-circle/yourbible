import { useCallback, useRef, useState } from "react";
import {
  clampFloatingPanelPosition,
  journalVideoFloatingDefaultRect,
  journalVideoFloatingResize,
  type FloatingPanelRect,
} from "@/lib/journal/journalVideoFloatingLayout";

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type ResizeState = {
  startX: number;
  startY: number;
  origin: FloatingPanelRect;
};

type Options = {
  enabled?: boolean;
};

/** Draggable + resizable floating panel; opens centered at dialog size. */
export function useFloatingPanel({ enabled = true }: Options = {}) {
  const [rect, setRect] = useState<FloatingPanelRect>(() => journalVideoFloatingDefaultRect());
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  const viewport = useCallback(
    () => ({ width: window.innerWidth, height: window.innerHeight }),
    [],
  );

  const onDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: rect.x,
        originY: rect.y,
      };
    },
    [enabled, rect.x, rect.y],
  );

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const vp = viewport();
      setRect((prev) =>
        clampFloatingPanelPosition(
          {
            ...prev,
            x: drag.originX + (e.clientX - drag.startX),
            y: drag.originY + (e.clientY - drag.startY),
          },
          vp,
        ),
      );
    },
    [viewport],
  );

  const onDragPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origin: rect,
      };
    },
    [enabled, rect],
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;
      const vp = viewport();
      const next = journalVideoFloatingResize(
        resize.origin,
        e.clientX - resize.startX,
        e.clientY - resize.startY,
        vp,
      );
      setRect(clampFloatingPanelPosition(next, vp));
    },
    [viewport],
  );

  const onResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const resetLayout = useCallback(() => {
    setRect(journalVideoFloatingDefaultRect(viewport()));
  }, [viewport]);

  return {
    rect,
    resetLayout,
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  };
}
