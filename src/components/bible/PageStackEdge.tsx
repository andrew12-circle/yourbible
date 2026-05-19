/** Gilt “front face” on the outer fore-edge of the page block. */
function outerGiltFace(side: "left" | "right"): string {
  return side === "left"
    ? "linear-gradient(90deg, hsl(46 85% 70%) 0%, hsl(42 72% 54%) 32%, hsl(34 52% 34%) 78%, hsl(20 28% 12%) 100%)"
    : "linear-gradient(270deg, hsl(46 85% 70%) 0%, hsl(42 72% 54%) 32%, hsl(34 52% 34%) 78%, hsl(20 28% 12%) 100%)";
}

function stackBackground(side: "left" | "right"): string {
  // Fore-edge: strip is tall + narrow; each sheet edge is a **vertical** line (‖ spine).
  // Repeats run across the strip width (page thickness), not top-to-bottom.
  const alongThickness = side === "left" ? "90deg" : "270deg";
  const inward = side === "left" ? "90deg" : "270deg";

  const pageLeaves = `repeating-linear-gradient(${alongThickness},
    hsl(44 52% 94%) 0px 0.35px,
    hsl(38 36% 82%) 0.35px 1.1px,
    hsl(42 40% 88%) 1.1px 1.85px,
    hsl(30 28% 52% / 0.35) 1.85px 2.05px,
    hsl(36 34% 76%) 2.05px 2.4px)`;

  const pageLeaves2 = `repeating-linear-gradient(${alongThickness},
    transparent 0 2.7px,
    hsl(0 0% 0% / 0.07) 2.7px 2.85px,
    transparent 2.85px 5.4px,
    hsl(40 45% 96% / 0.4) 5.4px 5.55px,
    transparent 5.55px 8.1px)`;

  const quires = `repeating-linear-gradient(${alongThickness},
    transparent 0 10px,
    hsl(28 30% 22% / 0.14) 10px 11px,
    transparent 11px 22px,
    hsl(26 28% 18% / 0.1) 22px 23px)`;

  const grain = `repeating-linear-gradient(${alongThickness},
    transparent 0 3px,
    hsl(38 30% 70% / 0.05) 3px 3.5px,
    transparent 3.5px 7px)`;

  const roundFace = `linear-gradient(${inward},
    hsl(32 32% 24% / 0.55) 0%,
    hsl(40 38% 52% / 0.15) 35%,
    hsl(44 42% 72% / 0.22) 50%,
    hsl(40 38% 52% / 0.15) 65%,
    hsl(28 28% 18% / 0.5) 100%)`;

  const volume = `linear-gradient(${inward},
    hsl(36 42% 38%) 0%,
    hsl(38 40% 44%) 40%,
    hsl(34 36% 34%) 78%,
    hsl(22 24% 14%) 100%)`;

  return `${grain}, ${pageLeaves}, ${pageLeaves2}, ${quires}, ${roundFace}, ${volume}`;
}

interface Props {
  side: "left" | "right";
  /** Visible thickness of the page block in px */
  widthPx: number;
}

/**
 * Stacked page edges on the outer fore-edge of an open spread — vertical sheet
 * lines (parallel to the spine) across the thickness of the block.
 */
export function PageStackEdge({ side, widthPx }: Props) {
  if (widthPx <= 0) return null;

  const isLeft = side === "left";
  const giltW = Math.min(4, Math.max(2, Math.round(widthPx * 0.14)));
  const spineShadow = isLeft ? "90deg" : "270deg";

  return (
    <div
      aria-hidden
      className={`absolute top-0 bottom-0 z-[3] pointer-events-none overflow-hidden ${
        isLeft ? "left-0 rounded-tl-[4px] rounded-bl-[4px]" : "right-0 rounded-tr-[4px] rounded-br-[4px]"
      }`}
      style={{
        width: widthPx,
        boxShadow: isLeft
          ? "inset -3px 0 8px hsl(0 0% 0% / 0.22), 2px 0 10px -4px hsl(0 0% 0% / 0.15)"
          : "inset 3px 0 8px hsl(0 0% 0% / 0.22), -2px 0 10px -4px hsl(0 0% 0% / 0.15)",
      }}
    >
      {/* Layered sheets — slight steps toward the spine */}
      {[0, 1, 2].map((layer) => (
        <div
          key={layer}
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            [isLeft ? "left" : "right"]: layer,
            width: Math.max(2, widthPx - layer * 2),
            top: layer,
            bottom: layer,
            opacity: 1 - layer * 0.22,
            background: stackBackground(side),
            boxShadow: layer > 0 ? `0 0 0 1px hsl(0 0% 0% / ${0.06 + layer * 0.04})` : undefined,
          }}
        />
      ))}

      {/* Gilt fore-edge */}
      <div
        className="absolute inset-y-0 pointer-events-none z-[2]"
        style={{
          [isLeft ? "left" : "right"]: 0,
          width: giltW,
          background: outerGiltFace(side),
          boxShadow: isLeft
            ? "inset -1px 0 0 hsl(48 90% 88% / 0.35)"
            : "inset 1px 0 0 hsl(48 90% 88% / 0.35)",
        }}
      />

      {/* Shadow where pages meet the spine */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-[4]"
        style={{
          [isLeft ? "right" : "left"]: 0,
          width: Math.min(12, Math.max(6, Math.round(widthPx * 0.35))),
          background: `linear-gradient(${spineShadow}, hsl(0 0% 0% / 0.28) 0%, transparent 100%)`,
        }}
      />

      {/* Top/bottom page-block rounding */}
      <div
        className="absolute left-0 right-0 top-0 h-3 pointer-events-none z-[5]"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 0% / 0.12) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 h-3 pointer-events-none z-[5]"
        style={{
          background: "linear-gradient(0deg, hsl(0 0% 0% / 0.14) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
