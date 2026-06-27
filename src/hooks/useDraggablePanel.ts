import { useCallback, useRef, useState } from "react";

type Point = { x: number; y: number };

type Options = {
  enabled?: boolean;
  defaultPosition?: Point;
};

/** Drag a fixed panel by its handle; position stored in state. */
export function useDraggablePanel({ enabled = true, defaultPosition = { x: 24, y: 96 } }: Options = {}) {
  const [position, setPosition] = useState<Point>(defaultPosition);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
      };
    },
    [enabled, position.x, position.y],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPosition({
      x: Math.max(8, drag.originX + (e.clientX - drag.startX)),
      y: Math.max(8, drag.originY + (e.clientY - drag.startY)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return { position, setPosition, onPointerDown, onPointerMove, onPointerUp };
}
