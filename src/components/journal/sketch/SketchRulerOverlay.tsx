import {
  RULER_BAND_HEIGHT,
  buildRulerMarks,
  type RulerMarkKind,
} from "@/lib/journal/sketchRuler";
import { cn } from "@/lib/utils";
import { Fragment, useMemo } from "react";

const TICK_HEIGHT: Record<RulerMarkKind, number> = {
  major: 11,
  half: 7,
  minor: 4,
};

type Props = {
  visible: boolean;
  centerX: number;
  centerY: number;
  angleDeg: number;
  lengthPx: number;
  isNightMode: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onRotatePointerDown: (e: React.PointerEvent) => void;
};

export default function SketchRulerOverlay({
  visible,
  centerX,
  centerY,
  angleDeg,
  lengthPx,
  isNightMode,
  onPointerDown,
  onRotatePointerDown,
}: Props) {
  const marks = useMemo(() => buildRulerMarks(lengthPx), [lengthPx]);

  if (!visible) return null;

  const tickColor = isNightMode ? "bg-white/50" : "bg-neutral-700/65";
  const numberColor = isNightMode ? "text-white/70" : "text-neutral-700/85";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden={!visible}
    >
      <div
        className="pointer-events-auto absolute"
        style={{
          left: centerX,
          top: centerY,
          width: lengthPx,
          height: RULER_BAND_HEIGHT,
          transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
          transformOrigin: "center center",
        }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          onPointerDown(e);
        }}
      >
        <div
          className={cn(
            "relative h-full w-full overflow-hidden rounded-[3px] border shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-[2px]",
            isNightMode
              ? "border-white/20 bg-[rgba(72,72,78,0.42)]"
              : "border-black/[0.08] bg-[rgba(245,245,250,0.48)]",
          )}
        >
          {marks.map((mark, idx) => {
            const h = TICK_HEIGHT[mark.kind];
            return (
              <Fragment key={`${mark.x}-${mark.kind}-${idx}`}>
                <span
                  className={cn(
                    "pointer-events-none absolute top-0 w-px",
                    tickColor,
                  )}
                  style={{ left: mark.x, height: h }}
                  aria-hidden
                />
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-0 w-px",
                    tickColor,
                  )}
                  style={{ left: mark.x, height: h }}
                  aria-hidden
                />
              </Fragment>
            );
          })}
          {marks
            .filter((m) => m.label != null)
            .map((mark) => (
              <span
                key={`label-${mark.x}-${mark.label}`}
                className={cn(
                  "pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums leading-none",
                  numberColor,
                )}
                style={{ left: mark.x }}
              >
                {mark.label}
              </span>
            ))}
          <button
            type="button"
            className={cn(
              "absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full border shadow-md",
              isNightMode
                ? "border-sky-400/60 bg-sky-500/90"
                : "border-sky-500/50 bg-sky-400",
            )}
            aria-label="Rotate ruler"
            onPointerDown={(e) => {
              e.stopPropagation();
              onRotatePointerDown(e);
            }}
          />
        </div>
      </div>
    </div>
  );
}
