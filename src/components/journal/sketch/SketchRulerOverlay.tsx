import { cn } from "@/lib/utils";

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
  if (!visible) return null;

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
          height: 44,
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
            "relative flex h-11 w-full items-center rounded-sm border shadow-lg",
            isNightMode
              ? "border-white/25 bg-neutral-700/95"
              : "border-neutral-400/80 bg-neutral-200/95",
          )}
          style={{
            backgroundImage: isNightMode
              ? "repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.15) 7px, rgba(255,255,255,0.15) 8px)"
              : "repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(0,0,0,0.08) 7px, rgba(0,0,0,0.08) 8px)",
          }}
        >
          {Array.from({ length: Math.floor(lengthPx / 28) }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute bottom-0 h-3 w-px",
                isNightMode ? "bg-white/50" : "bg-neutral-600/50",
              )}
              style={{ left: 14 + i * 28 }}
            />
          ))}
          <button
            type="button"
            className={cn(
              "absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border shadow-md",
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
