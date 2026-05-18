import { useCallback, useRef } from "react";
import { clampCoverFocal, journalCoverObjectPosition } from "@/lib/journal/covers";

interface Props {
  coverUrl: string;
  focalX: number;
  focalY: number;
  repositioning?: boolean;
  onFocalChange?: (x: number, y: number) => void;
  children?: React.ReactNode;
}

export default function JournalCoverBanner({
  coverUrl,
  focalX,
  focalY,
  repositioning = false,
  onFocalChange,
  children,
}: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; focalX: number; focalY: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!repositioning || !onFocalChange) return;
      e.preventDefault();
      dragRef.current = { x: e.clientX, y: e.clientY, focalX, focalY };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [repositioning, onFocalChange, focalX, focalY],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = dragRef.current;
      const frame = frameRef.current;
      if (!start || !frame || !onFocalChange) return;
      const { width, height } = frame.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const nextX = clampCoverFocal(start.focalX - (dx / width) * 100);
      const nextY = clampCoverFocal(start.focalY - (dy / height) * 100);
      onFocalChange(nextX, nextY);
    },
    [onFocalChange],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const objectPosition = journalCoverObjectPosition({
    cover_focal_x: focalX,
    cover_focal_y: focalY,
  });

  return (
    <div
      ref={frameRef}
      className={`relative h-44 sm:h-52 flex-shrink-0 overflow-hidden ${
        repositioning ? "cursor-grab active:cursor-grabbing touch-none select-none" : ""
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={coverUrl}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ objectPosition }}
      />
      {repositioning && (
        <div
          className="absolute inset-0 z-[5] flex items-center justify-center bg-black/25 pointer-events-none"
          aria-hidden
        >
          <p className="text-sm font-medium text-white/90 drop-shadow-sm">Drag to reposition</p>
        </div>
      )}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/10 ${
          repositioning ? "pointer-events-none" : ""
        }`}
      />
      {children}
    </div>
  );
}
