import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Concave-arc clip-path for a page surface. The top and bottom edges are
 * "tall" (closer to the page's outer y-bounds) at the spine and dip a few
 * pixels inward at the outer edge — so the open spread silhouettes like a
 * real bound book bowing outward, not a perfect rectangle.
 */
function buildArcClip(spine: "left" | "right"): string {
  const DIP = 0.9; // %
  const samples = 7;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * 100;
    const t = spine === "left" ? i / samples : 1 - i / samples;
    const y = DIP * Math.sin((t * Math.PI) / 2);
    pts.push(`${x.toFixed(2)}% ${y.toFixed(3)}%`);
  }
  for (let i = 0; i <= samples; i++) {
    const x = 100 - (i / samples) * 100;
    const t = spine === "left" ? 1 - i / samples : i / samples;
    const y = 100 - DIP * Math.sin((t * Math.PI) / 2);
    pts.push(`${x.toFixed(2)}% ${y.toFixed(3)}%`);
  }
  return `polygon(${pts.join(", ")})`;
}

const PAGE_ARC_CLIP_LEFT = buildArcClip("right");  // left page → spine on right
const PAGE_ARC_CLIP_RIGHT = buildArcClip("left");  // right page → spine on left

/**
 * Cumulative dip (in CSS px) the TOP page uses at its outermost corner.
 * Must match the visual depth of `buildArcClip(DIP=0.9)` over a typical page
 * height (~700–900px) — roughly 6–8 px. We use 8 here so the under-page band
 * has room to fan visibly above/below the top page.
 */
const TOP_PAGE_OUTER_DIP_PX = 8;
/**
 * How many px the deepest under-page edge (bottom of the stack) drops below
 * the top page at the outer corner. This is the visible "fanned page edges"
 * band that makes the spread look like a real bound book.
 */
const STACK_FAN_PX = 14;

interface Props {
  /** 0 = first page of Genesis, 1 = last page of Revelation */
  progress: number;
  leftPage: ReactNode;
  rightPage: ReactNode;
  /** On mobile, which page is currently shown */
  pageSide?: "left" | "right";
  /** Spine ribbons render slot */
  ribbons?: ReactNode;
  /**
   * Render thumb-index tabs for a given outer edge.
   * Called once for each visible page so tabs appear on the OUTER edge of each:
   *   - "left"  → left edge of left page
   *   - "right" → right edge of right page
   */
  renderTabs?: (side: "left" | "right") => ReactNode;
}

export function BookScene({
  progress,
  leftPage,
  rightPage,
  pageSide = "left",
  ribbons,
  renderTabs,
}: Props) {
  const isMobile = useIsMobile();
  // Wider gilt edges so the fanned page-block reads clearly on the sides.
  // Both stacks always show a visible gilt strip, even at the very start or
  // very end of the Bible — the cover's inner shadow eats ~10–14px, so the
  // minimum needs to comfortably exceed that.
  const totalStack = isMobile ? 32 : 44;
  const minStack = isMobile ? 16 : 22;
  const leftStack = Math.max(minStack, Math.round(totalStack * progress));
  const rightStack = Math.max(minStack, Math.round(totalStack * (1 - progress)));

  // Mobile: spine sits on the side OPPOSITE the page (so the page hugs the outer edge of the device)
  const spineOnRight = isMobile && pageSide === "left";
  const spineOnLeft = isMobile && pageSide === "right";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, hsl(28 28% 18%) 0%, hsl(24 24% 10%) 60%, hsl(20 20% 6%) 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(92deg, hsl(30 40% 30% / 0.5) 0 1px, transparent 1px 6px), repeating-linear-gradient(2deg, hsl(20 30% 14% / 0.4) 0 1px, transparent 1px 9px)",
        }}
      />

      <div
        className="relative z-10 mx-auto"
        style={{ maxWidth: isMobile ? "100vw" : "min(1480px, 99vw)" }}
      >
        <div className="pt-2 sm:pt-3 pb-3">
          {/* Outer leather cover */}
          <div
            className="relative rounded-[10px] p-[12px] sm:p-[16px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85),0_14px_28px_-10px_rgba(0,0,0,0.6),inset_0_2px_0_hsl(0_60%_30%/0.4),inset_0_-3px_8px_hsl(0_0%_0%/0.55)]"
            style={{
              backgroundImage:
                // SVG fractal-noise grain (fine leather pores)
                `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),` +
                // larger creases / scuffs
                `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.05  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),` +
                // worn highlights at top/edges
                "radial-gradient(ellipse 70% 35% at 50% 0%, hsl(10 70% 38% / 0.55) 0%, transparent 70%)," +
                "radial-gradient(ellipse 60% 30% at 50% 100%, hsl(0 0% 0% / 0.55) 0%, transparent 70%)," +
                "radial-gradient(ellipse at 25% 25%, hsl(8 55% 32% / 0.5) 0%, transparent 60%)," +
                "radial-gradient(ellipse at 75% 75%, hsl(0 60% 8% / 0.55) 0%, transparent 60%)," +
                // base oxblood leather
                "linear-gradient(150deg, hsl(0 45% 16%) 0%, hsl(0 50% 24%) 35%, hsl(0 55% 20%) 60%, hsl(0 60% 12%) 100%)",
              backgroundBlendMode:
                "overlay, multiply, screen, multiply, multiply, multiply, normal",
            }}
          >
            {/* Soft leather sheen across the surface */}
            <div
              className="absolute inset-0 rounded-[10px] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, transparent 0%, hsl(20 60% 60% / 0.07) 38%, hsl(30 70% 70% / 0.10) 50%, hsl(20 60% 50% / 0.05) 62%, transparent 100%)",
                mixBlendMode: "screen",
              }}
            />
            {/* Subtle scuff streaks — irregular, very low opacity */}
            <div
              className="absolute inset-0 rounded-[10px] pointer-events-none opacity-30 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(122deg, hsl(0 0% 0% / 0.12) 0 0.5px, transparent 0.5px 11px), repeating-linear-gradient(58deg, hsl(0 0% 100% / 0.06) 0 0.5px, transparent 0.5px 17px)",
              }}
            />
            <div
              className="absolute inset-1.5 rounded-[8px] pointer-events-none"
              style={{
                border: "1px solid hsl(38 58% 52% / 0.45)",
                boxShadow:
                  "inset 0 0 0 1px hsl(0 0% 0% / 0.4), inset 0 0 24px hsl(0 0% 0% / 0.45)",
              }}
            />

            {/* Page block */}
            <div
              className="relative paper-texture rounded-[3px] overflow-hidden"
              style={{
                marginTop: 4,
                marginBottom: 4,
                boxShadow:
                  "inset 0 0 60px hsl(30 30% 60% / 0.25), inset 0 0 0 1px hsl(var(--paper-edge))",
                minHeight: "calc(100vh - 40px)",
                perspective: isMobile ? undefined : "1800px",
                perspectiveOrigin: "50% 50%",
              }}
            >
              {/* Page-stacks */}
              {/* On mobile we only show the stack on the OUTER edge of the visible page */}
              {(!isMobile || pageSide === "left") && (
                <div
                  className="absolute left-0 top-0 bottom-0 pointer-events-none z-[1]"
                  style={{ width: leftStack, background: stackBackground("left") }}
                />
              )}
              {(!isMobile || pageSide === "right") && (
                <div
                  className="absolute right-0 top-0 bottom-0 pointer-events-none z-[1]"
                  style={{ width: rightStack, background: stackBackground("right") }}
                />
              )}

              {/* === Page surfaces === */}
              {!isMobile ? (
                <>
                  {/* Fanned under-page edges along the TOP and BOTTOM of the spread.
                      They arc the same way as the top page (deepest dip at the outer
                      corners, high at the spine) but extend a few px further out, so
                      the lower pages appear to peek out past the topmost sheet — the
                      classic look of an open bound book lying on a table. */}
                  <PageStackArc edge="top" />
                  <PageStackArc edge="bottom" />
                  {/* Left page */}
                  <div
                    className="absolute top-0 bottom-0 z-[2]"
                    style={{
                      left: leftStack,
                      right: "50%",
                      paddingRight: 6,
                      transform: "rotateY(4deg)",
                      transformOrigin: "right center",
                      transformStyle: "preserve-3d",
                      backfaceVisibility: "hidden",
                      willChange: "transform",
                    }}
                  >
                    <PageCurve side="right" />
                    <div
                      className="relative h-full overflow-hidden"
                      style={{
                        // Top edge: high at the spine (right), dipping ~7px lower at the outer edge (left).
                        // Bottom edge mirrors the same arc.
                        clipPath: PAGE_ARC_CLIP_LEFT,
                      }}
                    >
                      {leftPage}
                      <PageEdgeShading side="left" />
                    </div>
                  </div>
                  {/* Right page */}
                  <div
                    className="absolute top-0 bottom-0 z-[2]"
                    style={{
                      left: "50%",
                      right: rightStack,
                      paddingLeft: 6,
                      transform: "rotateY(-4deg)",
                      transformOrigin: "left center",
                      transformStyle: "preserve-3d",
                      backfaceVisibility: "hidden",
                      willChange: "transform",
                    }}
                  >
                    <PageCurve side="left" />
                    <div
                      className="relative h-full overflow-hidden"
                      style={{
                        // Mirror of the left page: high at the spine (left), dipping toward the outer edge (right).
                        clipPath: PAGE_ARC_CLIP_RIGHT,
                      }}
                    >
                      {rightPage}
                      <PageEdgeShading side="right" />
                    </div>
                  </div>
                  {/* Spine */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[64px] pointer-events-none z-[3]"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, hsl(0 0% 0% / 0.18) 35%, hsl(0 0% 0% / 0.30) 50%, hsl(0 0% 0% / 0.18) 65%, transparent 100%)",
                    }}
                  />
                  <div
                    className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px pointer-events-none z-[3]"
                    style={{ background: "hsl(0 0% 0% / 0.4)" }}
                  />
                </>
              ) : (
                <>
                  {/* Single page; spine on inner side */}
                  <div
                    className="absolute top-0 bottom-0 z-[2]"
                    style={{
                      left: spineOnLeft ? leftStack + 24 : leftStack,
                      right: spineOnRight ? rightStack + 24 : rightStack,
                    }}
                  >
                    <div className="relative h-full overflow-hidden">
                      {pageSide === "left" ? leftPage : rightPage}
                    </div>
                  </div>
                  {spineOnLeft && (
                    <>
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none z-[3]"
                        style={{
                          left: leftStack,
                          width: 28,
                          background:
                            "linear-gradient(90deg, hsl(0 0% 0% / 0.32) 0%, hsl(0 0% 0% / 0.18) 60%, transparent 100%)",
                        }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-px pointer-events-none z-[3]"
                        style={{ left: leftStack, background: "hsl(0 0% 0% / 0.4)" }}
                      />
                    </>
                  )}
                  {spineOnRight && (
                    <>
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none z-[3]"
                        style={{
                          right: rightStack,
                          width: 28,
                          background:
                            "linear-gradient(270deg, hsl(0 0% 0% / 0.32) 0%, hsl(0 0% 0% / 0.18) 60%, transparent 100%)",
                        }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-px pointer-events-none z-[3]"
                        style={{ right: rightStack, background: "hsl(0 0% 0% / 0.4)" }}
                      />
                    </>
                  )}
                </>
              )}

            </div>
            {/* === Tabs — render OUTSIDE the page-block so they can overhang the gilt edge === */}
            {renderTabs && (!isMobile || pageSide === "left") && (
              <div
                className="absolute top-0 bottom-0 z-[7] pointer-events-none"
                style={{ left: isMobile ? 12 : 16 }}
              >
                {renderTabs("left")}
              </div>
            )}
            {renderTabs && (!isMobile || pageSide === "right") && (
              <div
                className="absolute top-0 bottom-0 z-[7] pointer-events-none"
                style={{ right: isMobile ? 12 : 16 }}
              >
                {renderTabs("right")}
              </div>
            )}
            {/* Ribbons live OUTSIDE the page block so they can overhang the bottom of the book */}
            {!isMobile && ribbons && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-[8]"
                style={{ top: isMobile ? 12 : 16, bottom: -56 }}
              >
                {ribbons}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageCurve({ side }: { side: "left" | "right" }) {
  return (
    <>
      {/* Spine-side shadow — page dips into the gutter */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-[3]"
        style={{
          [side]: 0,
          width: 56,
          background:
            side === "right"
              ? "linear-gradient(270deg, hsl(0 0% 0% / 0.32) 0%, hsl(0 0% 0% / 0.12) 45%, transparent 100%)"
              : "linear-gradient(90deg, hsl(0 0% 0% / 0.32) 0%, hsl(0 0% 0% / 0.12) 45%, transparent 100%)",
        }}
      />
      {/* Outer-edge highlight — the part of the page closest to the eye */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-[3]"
        style={{
          [side === "right" ? "left" : "right"]: 0,
          width: 70,
          background:
            side === "right"
              ? "linear-gradient(90deg, hsl(40 60% 96% / 0.55) 0%, transparent 100%)"
              : "linear-gradient(270deg, hsl(40 60% 96% / 0.55) 0%, transparent 100%)",
          mixBlendMode: "screen",
        }}
      />
    </>
  );
}

/**
 * Renders the visible cumulative top (or bottom) edges of the page block as a
 * series of fine arched lines that follow the same curve as the top page but
 * dip a few px deeper at the outer corners. This is what makes the spread
 * read as a real bound book lying open: lower pages bow out past the top
 * sheet at the outer edges, while staying perfectly flush at the spine.
 *
 * Pure inline SVG — no extra deps. Sits BEHIND the page surfaces so it shows
 * only at the strips that are not covered by the (more tightly clipped) top
 * page. We render it slightly outside the page block so it overhangs by a
 * couple of pixels — like a real book.
 */
function PageStackArc({ edge }: { edge: "top" | "bottom" }) {
  // Number of fanned sheets to draw. More = denser fan, but more SVG cost.
  const SHEETS = 9;
  // Total band height in px (how far the deepest sheet sits from the page edge).
  const BAND_PX = 18;
  // How far the topmost sheet line sits above the page surface (gives the
  // top page itself a thin visible gilt highlight along its arched edge).
  const OVERHANG_PX = 2;
  // viewBox math — width is arbitrary; we use 1000 for sub-px precision.
  const VW = 1000;
  const VH = BAND_PX + OVERHANG_PX;
  const isTop = edge === "top";

  // For each sheet i (0 = topmost / shortest dip, SHEETS-1 = deepest / fans
  // out the furthest), build a path that arcs from spine-flush to a deeper
  // dip at the outer corners. Spine sits at x = VW/2.
  const paths: { d: string; opacity: number; stroke: string }[] = [];
  for (let i = 0; i < SHEETS; i++) {
    // 0 → top page line, 1 → deepest underneath sheet
    const t = i / (SHEETS - 1);
    // Per-sheet outer dip in viewBox units. Topmost sheet matches the page
    // surface's own dip, deepest sheet adds STACK_FAN_PX of fan.
    const outerDip = (TOP_PAGE_OUTER_DIP_PX + t * STACK_FAN_PX) * (VH / (BAND_PX + OVERHANG_PX));
    // The y-coordinate of the sheet at the spine (always near top of the band
    // for the top edge / near bottom for the bottom edge — flush with the page).
    const spineY = isTop ? OVERHANG_PX : VH - OVERHANG_PX;
    // The y-coordinate at the outer corners — dips away from the page.
    const outerY = isTop ? OVERHANG_PX + outerDip : VH - OVERHANG_PX - outerDip;

    // Build a smooth curve: high at the spine (x = VW/2), dipping out toward
    // x = 0 and x = VW. We sample the same sin-quarter shape as buildArcClip
    // so the topmost sheet exactly matches the top page's clip-path.
    const samples = 14;
    const pts: string[] = [];
    for (let s = 0; s <= samples; s++) {
      const x = (s / samples) * VW;
      // Distance from spine, normalized 0 (spine) → 1 (outer corner).
      const distFromSpine = Math.abs(x - VW / 2) / (VW / 2);
      // Same sin-quarter curve used in buildArcClip.
      const dipFrac = Math.sin((distFromSpine * Math.PI) / 2);
      const y = isTop
        ? spineY + (outerY - spineY) * dipFrac
        : spineY - (spineY - outerY) * dipFrac;
      pts.push(`${x.toFixed(2)},${y.toFixed(3)}`);
    }
    const d = `M ${pts.join(" L ")}`;

    // Topmost = bright gilt line, deeper sheets = progressively duskier gold.
    const lightness = 72 - t * 28; // 72% → 44%
    const sat = 70 - t * 25;
    const stroke = `hsl(${38 + t * 4} ${sat}% ${lightness}%)`;
    const opacity = 0.95 - t * 0.35;
    paths.push({ d, opacity, stroke });
  }

  return (
    <div
      aria-hidden
      className="absolute left-0 right-0 pointer-events-none z-[1]"
      style={{
        height: VH,
        [isTop ? "top" : "bottom"]: -OVERHANG_PX,
      }}
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{
          display: "block",
          // Soft drop shadow gives the fanned edge a hint of physical depth.
          filter: isTop
            ? "drop-shadow(0 1px 0.5px hsl(28 35% 22% / 0.45))"
            : "drop-shadow(0 -1px 0.5px hsl(28 35% 22% / 0.45))",
        }}
      >
        {/* Warm gilt wash beneath the individual sheet lines so the band reads
            as a continuous gilded edge, not just stripes. */}
        <defs>
          <linearGradient
            id={`stack-arc-wash-${edge}`}
            x1="0"
            y1={isTop ? 0 : VH}
            x2="0"
            y2={isTop ? VH : 0}
          >
            <stop offset="0%" stopColor="hsl(40 75% 65%)" stopOpacity="0.0" />
            <stop offset="35%" stopColor="hsl(38 70% 58%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(32 55% 38%)" stopOpacity="0.85" />
          </linearGradient>
          {/* Mask: only show the wash inside the area between the topmost
              sheet curve and the deepest sheet curve, so we don't paint over
              the actual page surfaces. */}
          <clipPath id={`stack-arc-clip-${edge}`}>
            <path
              d={
                // Top boundary = topmost sheet curve; bottom boundary =
                // deepest sheet curve. Combine into a closed region.
                `${paths[0].d} L ${paths[SHEETS - 1].d
                  .replace(/^M /, "")
                  .split(" ")
                  .reverse()
                  .join(" L ")} Z`
              }
            />
          </clipPath>
        </defs>
        <rect
          x="0"
          y="0"
          width={VW}
          height={VH}
          fill={`url(#stack-arc-wash-${edge})`}
          clipPath={`url(#stack-arc-clip-${edge})`}
        />
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.stroke}
            strokeOpacity={p.opacity}
            strokeWidth={i === 0 ? 0.9 : 0.6}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

function stackBackground(side: "left" | "right") {
  // Side gilt edge — what you see of the fanned page block from the outside
  // of an open Bible. Warm gold base + ultra-fine vertical striations that
  // suggest hundreds of stacked sheets, plus a soft inward (toward-spine) shade.
  const outward = side === "left" ? "270deg" : "90deg"; // toward the outer edge
  const inward = side === "left" ? "90deg" : "270deg";  // toward the spine
  // Fine vertical "individual sheets" striations across the gilt face.
  const sheets = `repeating-linear-gradient(${outward},
    hsl(38 55% 58% / 0.95) 0 0.5px,
    hsl(42 75% 70% / 0.85) 0.5px 1.1px,
    hsl(36 50% 45% / 0.55) 1.1px 1.4px,
    hsl(40 65% 62% / 0.85) 1.4px 2.2px)`;
  // Wider, irregular darker bands — uneven page heights / shadow lines.
  const bands = `repeating-linear-gradient(${outward},
    transparent 0 7px,
    hsl(28 35% 28% / 0.22) 7px 7.4px,
    transparent 7.4px 17px,
    hsl(28 35% 28% / 0.14) 17px 17.3px)`;
  // Warm gold base that gets darker toward the spine.
  const gilt = `linear-gradient(${inward},
    hsl(38 78% 62%) 0%,
    hsl(40 70% 55%) 35%,
    hsl(34 55% 40%) 75%,
    hsl(0 0% 0% / 0.45) 100%)`;
  return `${bands}, ${sheets}, ${gilt}`;
}

/**
 * Faint shadow strips that hug the curved top/bottom edges so the arc reads as
 * depth (a slightly bowed sheet) rather than just a clipped rectangle.
 * Pure CSS — no extra DOM nodes outside the page surface itself.
 */
function PageEdgeShading({ side }: { side: "left" | "right" }) {
  // The "outer edge" (where the dip is deepest) is on the left for the left
  // page and on the right for the right page. We darken slightly more on the
  // outer side so the curve has perceived volume.
  const outer = side === "left" ? "270deg" : "90deg";
  return (
    <>
      {/* Top edge shadow — soft, fades downward */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-0 pointer-events-none z-[4]"
        style={{
          height: 14,
          background:
            "linear-gradient(180deg, hsl(0 0% 0% / 0.18) 0%, hsl(0 0% 0% / 0.06) 55%, transparent 100%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* Bottom edge shadow — soft, fades upward */}
      <div
        aria-hidden
        className="absolute left-0 right-0 bottom-0 pointer-events-none z-[4]"
        style={{
          height: 16,
          background:
            "linear-gradient(0deg, hsl(0 0% 0% / 0.22) 0%, hsl(0 0% 0% / 0.07) 55%, transparent 100%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* Subtle outer-edge darkening to enhance the bowed read */}
      <div
        aria-hidden
        className="absolute top-0 bottom-0 pointer-events-none z-[4]"
        style={{
          [side === "left" ? "left" : "right"]: 0,
          width: 24,
          background: `linear-gradient(${outer}, hsl(0 0% 0% / 0.10) 0%, transparent 100%)`,
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}
