import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from "react";

/** Fore-edge strip — iBooks-style minimum touch target. */
export const SWIPE_OUTER_ZONE = "max(3rem, clamp(1.125rem, 4vmin, 2.25rem))";
/** Spine / gutter strip — matches page gutter padding, min 48px. */
export const SWIPE_GUTTER_ZONE = "max(3rem, clamp(2.25rem, 8vmin, 4.5rem))";

const COMMIT = 56;
const VEL = 320;
const LOCK_PX = 14;

function useSwipeGesture(isRight: boolean, onTurn: (delta: 1 | -1) => void) {
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

  return {
    gesturing,
    handlers: {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        track.current = {
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastT: performance.now(),
          vx: 0,
          locked: false,
        };
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
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
        if (Math.abs(dx) > LOCK_PX && Math.abs(dx) > Math.abs(dy) * 1.35) {
          t.locked = true;
          setGesturing(true);
          window.getSelection()?.removeAllRanges();
        }
      },
      onPointerUp: endGesture,
      onPointerCancel: endGesture,
    },
  };
}

function SwipeMarginStrip({
  edge,
  side,
  onTurn,
  onGesturing,
}: {
  edge: "outer" | "inner";
  side: "left" | "right";
  onTurn: (delta: 1 | -1) => void;
  onGesturing: (active: boolean) => void;
}) {
  const isRightPage = side === "right";
  const { gesturing, handlers } = useSwipeGesture(isRightPage, onTurn);

  useEffect(() => {
    onGesturing(gesturing);
  }, [gesturing, onGesturing]);

  const onOuter = edge === "outer";
  const atLeft =
    (side === "left" && onOuter) || (side === "right" && !onOuter);

  return (
    <div
      aria-hidden
      className={
        "absolute top-0 bottom-0 z-[6] touch-pan-y " +
        (atLeft ? "left-0" : "right-0")
      }
      style={{ width: onOuter ? SWIPE_OUTER_ZONE : SWIPE_GUTTER_ZONE }}
      {...handlers}
    />
  );
}

/** Horizontal swipe to turn pages — only in margin strips, not over the text column. */
export function SwipePage({
  side,
  onTurn,
  children,
}: {
  side: "left" | "right";
  onTurn: (delta: 1 | -1) => void;
  children: ReactNode;
}) {
  const [gesturing, setGesturing] = useState(false);
  const outerGesturing = useRef(false);
  const innerGesturing = useRef(false);

  const syncGesturing = useCallback(() => {
    setGesturing(outerGesturing.current || innerGesturing.current);
  }, []);

  const onOuterGesturing = useCallback(
    (active: boolean) => {
      outerGesturing.current = active;
      syncGesturing();
    },
    [syncGesturing],
  );

  const onInnerGesturing = useCallback(
    (active: boolean) => {
      innerGesturing.current = active;
      syncGesturing();
    },
    [syncGesturing],
  );

  return (
    <div
      className={
        "relative h-full w-full min-h-0 min-w-0 overflow-hidden " +
        (gesturing ? "[&_.selectable-text]:!select-none" : "")
      }
    >
      {children}
      <SwipeMarginStrip
        edge="outer"
        side={side}
        onTurn={onTurn}
        onGesturing={onOuterGesturing}
      />
      <SwipeMarginStrip
        edge="inner"
        side={side}
        onTurn={onTurn}
        onGesturing={onInnerGesturing}
      />
    </div>
  );
}
