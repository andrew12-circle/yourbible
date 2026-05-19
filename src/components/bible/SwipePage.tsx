import { useRef, useState, type ReactNode, type PointerEvent } from "react";

/** Horizontal swipe to turn pages — gesture only, page content stays fixed. */
export function SwipePage({
  side,
  onTurn,
  children,
}: {
  side: "left" | "right";
  onTurn: (delta: 1 | -1) => void;
  children: ReactNode;
}) {
  const isRight = side === "right";
  const COMMIT = 56;
  const VEL = 320;
  const [gesturing, setGesturing] = useState(false);
  const track = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    vx: number;
    locked: boolean;
  } | null>(null);

  const endGesture = (e: PointerEvent<HTMLDivElement>) => {
    const t = track.current;
    track.current = null;
    if (!t?.locked) {
      setGesturing(false);
      return;
    }
    const dx = e.clientX - t.startX;
    const vx = t.vx;
    setGesturing(false);
    if (isRight) {
      if (dx < -COMMIT || vx < -VEL) onTurn(1);
      else if (dx > COMMIT || vx > VEL) onTurn(-1);
    } else {
      if (dx > COMMIT || vx > VEL) onTurn(-1);
      else if (dx < -COMMIT || vx < -VEL) onTurn(1);
    }
  };

  return (
    <div
      className={
        "relative h-full w-full min-h-0 min-w-0 overflow-hidden touch-pan-y " +
        (gesturing ? "[&_.selectable-text]:!select-none" : "")
      }
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        track.current = {
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastT: performance.now(),
          vx: 0,
          locked: false,
        };
      }}
      onPointerMove={(e) => {
        const t = track.current;
        if (!t) return;
        const now = performance.now();
        const dt = now - t.lastT;
        if (dt > 0) t.vx = ((e.clientX - t.lastX) / dt) * 1000;
        t.lastX = e.clientX;
        t.lastT = now;
        if (t.locked) return;
        const dx = e.clientX - t.startX;
        const dy = e.clientY - t.startY;
        if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.35) {
          t.locked = true;
          setGesturing(true);
          window.getSelection()?.removeAllRanges();
        }
      }}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {children}
    </div>
  );
}
