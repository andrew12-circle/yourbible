import { cn } from "@/lib/utils";

type SpreadPageSpineShadeProps = {
  side: "left" | "right";
  /** Open two-page spread (not cropped single-page mode). */
  spread: boolean;
};

/** Inner-edge curl shadow where each page meets the binding gutter. */
export function SpreadPageSpineShade({ side, spread }: SpreadPageSpineShadeProps) {
  if (!spread) return null;

  const isLeft = side === "left";

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 z-[4]",
          isLeft ? "right-0" : "left-0",
        )}
        style={{
          width: "clamp(1.5rem, 6vmin, 3.25rem)",
          background: isLeft
            ? "linear-gradient(90deg, transparent 0%, hsl(0 0% 0% / 0.06) 45%, hsl(0 0% 0% / 0.18) 100%)"
            : "linear-gradient(270deg, transparent 0%, hsl(0 0% 0% / 0.06) 45%, hsl(0 0% 0% / 0.18) 100%)",
        }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 z-[5]",
          isLeft ? "right-0" : "left-0",
        )}
        style={{
          width: "clamp(0.35rem, 1vmin, 0.6rem)",
          boxShadow: isLeft
            ? "inset -3px 0 8px hsl(0 0% 0% / 0.22)"
            : "inset 3px 0 8px hsl(0 0% 0% / 0.22)",
        }}
      />
    </>
  );
}
