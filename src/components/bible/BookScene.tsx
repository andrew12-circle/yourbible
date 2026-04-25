import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/* =============================================================
   SHARED CURVE SYSTEM
   The realism of an open Bible depends on the cover, the visible
   page block, the under-page fan, and the top page surface all
   reading as ONE coherent physical form — not as separate layered
   effects. Every arched edge here is driven from the same
   quarter-sine curve. Layers differ only by how deep their outer
   corner dips, expressed as a fraction of page-block height.

     Layer            outerDip (% of PB height)   visual role
     --------------   -------------------------   ---------------
     top page         0.9 %                       readable sheet
     page-stack fan   1.6 %  (deepest sheet)      sheets peeking
     leather cover    2.4 %                       outer shell
   ============================================================= */

const CURVE_SAMPLES = 16;
const TOP_PAGE_DIP_PCT = 0.9;
const STACK_FAN_DEEPEST_PCT = 1.6;
const COVER_DIP_PCT = 2.4;

function dipFraction(distFromSpineNorm: number): number {
  return Math.sin((Math.min(1, Math.max(0, distFromSpineNorm)) * Math.PI) / 2);
}

function buildArcClip(spine: "left" | "right"): string {
  const DIP = TOP_PAGE_DIP_PCT;
  const samples = CURVE_SAMPLES;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * 100;
    const t = spine === "left" ? i / samples : 1 - i / samples;
    const y = DIP * dipFraction(t);
    pts.push(`${x.toFixed(2)}% ${y.toFixed(3)}%`);
  }
  for (let i = 0; i <= samples; i++) {
    const x = 100 - (i / samples) * 100;
    const t = spine === "left" ? 1 - i / samples : i / samples;
    const y = 100 - DIP * dipFraction(t);
    pts.push(`${x.toFixed(2)}% ${y.toFixed(3)}%`);
  }
  return `polygon(${pts.join(", ")})`;
}

const PAGE_ARC_CLIP_LEFT = buildArcClip("right");
const PAGE_ARC_CLIP_RIGHT = buildArcClip("left");

/** Page-stack constants (px), tied to the curve family above. */
const TOP_PAGE_OUTER_DIP_PX = 9;
const STACK_FAN_PX = 12;

function buildCoverArcMask(): string {
  const W = 1000;
  const H = 1000;
  const DIP = (COVER_DIP_PCT / 100) * H; // 24 viewBox units
  const R = 10;
  const samples = CURVE_SAMPLES;
  const topPts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = R + ((W - 2 * R) * i) / samples;
    const dip = DIP * dipFraction(Math.abs(x - W / 2) / (W / 2 - R));
    topPts.push(`${x.toFixed(2)},${dip.toFixed(2)}`);
  }
  const bottomPts: string[] = [];
  for (let i = samples; i >= 0; i--) {
    const x = R + ((W - 2 * R) * i) / samples;
    const dip = DIP * dipFraction(Math.abs(x - W / 2) / (W / 2 - R));
    bottomPts.push(`${x.toFixed(2)},${(H - dip).toFixed(2)}`);
  }
  const topY0 = topPts[0].split(",")[1];
  const topYEnd = topPts[topPts.length - 1].split(",")[1];
  const bottomY0 = bottomPts[0].split(",")[1];
  const d =
    `M ${R},${topY0} ` +
    `L ${topPts.slice(1).join(" L ")} ` +
    `Q ${W},${topYEnd} ${W},${Number(topYEnd) + R} ` +
    `L ${W},${H - R} ` +
    `Q ${W},${H} ${W - R},${bottomY0} ` +
    `L ${bottomPts.slice(1).join(" L ")} ` +
    `Q 0,${H} 0,${H - R} ` +
    `L 0,${Number(topY0) + R} ` +
    `Q 0,${topY0} ${R},${topY0} Z`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>` +
    `<path d='${d}' fill='white'/>` +
    `</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

const COVER_ARC_MASK = buildCoverArcMask();

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

  // Side gilt thickness — the visible compressed mass of pages on each side.
  // We taper this slightly toward the spine via gradients in stackBackground,
  // so the band itself is a wedge of gilt that compresses toward the gutter.
  const totalStack = isMobile ? 30 : 40;
  const minStack = isMobile ? 16 : 22;
  const leftStack = Math.max(minStack, Math.round(totalStack * progress));
  const rightStack = Math.max(minStack, Math.round(totalStack * (1 - progress)));

  // Mobile spine sits opposite the visible page
  const spineOnRight = isMobile && pageSide === "left";
  const spineOnLeft = isMobile && pageSide === "right";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        // Warm, dim wood-table tone — softer at top, deeper at bottom so the
        // book reads as resting ON something rather than floating in front.
        background:
          "radial-gradient(ellipse 90% 60% at 50% 25%, hsl(28 30% 20%) 0%, hsl(24 24% 11%) 55%, hsl(20 18% 6%) 100%)",
      }}
    >
      {/* Wood grain overlay — fine, low contrast, asymmetric */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(91deg, hsl(30 40% 32% / 0.55) 0 1px, transparent 1px 7px), " +
            "repeating-linear-gradient(2.4deg, hsl(20 30% 14% / 0.5) 0 1px, transparent 1px 11px)",
        }}
      />
      {/* Soft ambient light from above */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 35% at 50% 0%, hsl(40 60% 70% / 0.10) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative z-10 mx-auto"
        style={{ maxWidth: isMobile ? "100vw" : "min(1480px, 99vw)" }}
      >
        <div className="pt-2 sm:pt-3 pb-3 relative">
          {/* === Cast shadow on the table, follows the curved cover silhouette === */}
          {!isMobile && (
            <>
              {/* Wide ambient occlusion — soft, diffuse halo on the table */}
              <div
                aria-hidden
                className="absolute pointer-events-none"
                style={{
                  left: "-4%",
                  right: "-4%",
                  bottom: -46,
                  height: 110,
                  background:
                    "radial-gradient(ellipse 60% 100% at 50% 10%, hsl(0 0% 0% / 0.42) 0%, hsl(0 0% 0% / 0.18) 45%, transparent 80%)",
                  filter: "blur(22px)",
                  zIndex: 0,
                }}
              />
              {/* Tight contact shadow — narrow, dark band hugging the bottom edge */}
              <div
                aria-hidden
                className="absolute pointer-events-none"
                style={{
                  left: "6%",
                  right: "6%",
                  bottom: -8,
                  height: 26,
                  background:
                    "radial-gradient(ellipse 55% 100% at 50% 0%, hsl(0 0% 0% / 0.78) 0%, hsl(0 0% 0% / 0.45) 40%, transparent 75%)",
                  filter: "blur(5px)",
                  zIndex: 0,
                }}
              />
              {/* Hairline ground-line — anchors the book to the table */}
              <div
                aria-hidden
                className="absolute pointer-events-none"
                style={{
                  left: "10%",
                  right: "10%",
                  bottom: 2,
                  height: 4,
                  background:
                    "radial-gradient(ellipse 45% 100% at 50% 0%, hsl(0 0% 0% / 0.85) 0%, transparent 80%)",
                  filter: "blur(1.5px)",
                  zIndex: 0,
                }}
              />
            </>
          )}

          {/* Outer leather cover — wrapped in a drop-shadow filter so the cast
              shadow follows the cover's masked silhouette (box-shadow doesn't
              respect mask-image). */}
          <div
            className="relative"
            style={
              isMobile
                ? undefined
                : {
                    filter:
                      "drop-shadow(0 36px 36px rgba(0,0,0,0.55)) " +
                      "drop-shadow(0 12px 14px rgba(0,0,0,0.45)) " +
                      "drop-shadow(0 2px 1px rgba(0,0,0,0.4))",
                  }
            }
          >
            <div
              className={
                "relative rounded-[10px] p-[12px] sm:p-[16px] " +
                (isMobile
                  ? "shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85),0_14px_28px_-10px_rgba(0,0,0,0.6),inset_0_2px_0_hsl(0_60%_30%/0.4),inset_0_-3px_8px_hsl(0_0%_0%/0.55)]"
                  : "shadow-[inset_0_2px_0_hsl(0_60%_30%/0.4),inset_0_-3px_8px_hsl(0_0%_0%/0.55)]")
              }
              style={{
                ...(isMobile
                  ? null
                  : {
                      WebkitMaskImage: COVER_ARC_MASK,
                      maskImage: COVER_ARC_MASK,
                      WebkitMaskSize: "100% 100%",
                      maskSize: "100% 100%",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                    }),
                backgroundImage:
                  // fine leather pores
                  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),` +
                  // larger creases / scuffs
                  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.05  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),` +
                  // worn highlights and shadow accents
                  "radial-gradient(ellipse 70% 35% at 50% 0%, hsl(10 70% 38% / 0.5) 0%, transparent 70%)," +
                  "radial-gradient(ellipse 60% 30% at 50% 100%, hsl(0 0% 0% / 0.6) 0%, transparent 70%)," +
                  "radial-gradient(ellipse at 25% 25%, hsl(8 55% 32% / 0.5) 0%, transparent 60%)," +
                  "radial-gradient(ellipse at 75% 75%, hsl(0 60% 8% / 0.55) 0%, transparent 60%)," +
                  // base oxblood leather
                  "linear-gradient(150deg, hsl(0 45% 16%) 0%, hsl(0 50% 24%) 35%, hsl(0 55% 20%) 60%, hsl(0 60% 12%) 100%)",
                backgroundBlendMode:
                  "overlay, multiply, screen, multiply, multiply, multiply, normal",
              }}
            >
              {/* Leather sheen */}
              <div
                className="absolute inset-0 rounded-[10px] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(115deg, transparent 0%, hsl(20 60% 60% / 0.07) 38%, hsl(30 70% 70% / 0.10) 50%, hsl(20 60% 50% / 0.05) 62%, transparent 100%)",
                  mixBlendMode: "screen",
                }}
              />
              {/* Subtle scuff streaks */}
              <div
                className="absolute inset-0 rounded-[10px] pointer-events-none opacity-30 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(122deg, hsl(0 0% 0% / 0.12) 0 0.5px, transparent 0.5px 11px), " +
                    "repeating-linear-gradient(58deg, hsl(0 0% 100% / 0.06) 0 0.5px, transparent 0.5px 17px)",
                }}
              />
              {/* Inner gold rule + inner shadow */}
              <div
                className="absolute inset-1.5 rounded-[8px] pointer-events-none"
                style={{
                  border: "1px solid hsl(38 58% 52% / 0.45)",
                  boxShadow:
                    "inset 0 0 0 1px hsl(0 0% 0% / 0.4), inset 0 0 24px hsl(0 0% 0% / 0.45)",
                }}
              />
              {/* Soft self-shadow cast by the raised leather cover edge onto the
                  inset page block — stronger at top (light from above) and along
                  sides, lighter at the bottom where the page meets the cover. */}
              <div
                className="absolute inset-[10px] rounded-[6px] pointer-events-none"
                style={{
                  boxShadow:
                    "inset 0 10px 14px -2px hsl(0 0% 0% / 0.55), " +
                    "inset 0 -5px 10px -2px hsl(0 0% 0% / 0.32), " +
                    "inset 8px 0 12px -4px hsl(0 0% 0% / 0.40), " +
                    "inset -8px 0 12px -4px hsl(0 0% 0% / 0.40)",
                }}
              />
              {/* Hair-thin dark crease where the cover lip meets the paper */}
              <div
                className="absolute inset-[10px] rounded-[6px] pointer-events-none"
                style={{
                  boxShadow:
                    "inset 0 1px 0 hsl(0 0% 0% / 0.55), " +
                    "inset 0 -1px 0 hsl(0 0% 0% / 0.45), " +
                    "inset 1px 0 0 hsl(0 0% 0% / 0.45), " +
                    "inset -1px 0 0 hsl(0 0% 0% / 0.45)",
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
                {/* Side gilt page-stacks — wedge-shaped: thicker at the outer
                    edge, compressed near the spine. */}
                {(!isMobile || pageSide === "left") && (
                  <div
                    className="absolute left-0 top-0 bottom-0 pointer-events-none z-[1]"
                    style={{
                      width: leftStack,
                      background: stackBackground("left"),
                    }}
                  >
                    {/* Soft compression shadow on the spine-facing side */}
                    <div
                      className="absolute top-0 bottom-0 right-0 pointer-events-none"
                      style={{
                        width: 10,
                        background:
                          "linear-gradient(90deg, transparent 0%, hsl(0 0% 0% / 0.3) 100%)",
                      }}
                    />
                  </div>
                )}
                {(!isMobile || pageSide === "right") && (
                  <div
                    className="absolute right-0 top-0 bottom-0 pointer-events-none z-[1]"
                    style={{
                      width: rightStack,
                      background: stackBackground("right"),
                    }}
                  >
                    <div
                      className="absolute top-0 bottom-0 left-0 pointer-events-none"
                      style={{
                        width: 10,
                        background:
                          "linear-gradient(270deg, transparent 0%, hsl(0 0% 0% / 0.3) 100%)",
                      }}
                    />
                  </div>
                )}

                {/* === Page surfaces === */}
                {!isMobile ? (
                  <>
                    {/* Fanned under-page edges */}
                    <PageStackArc edge="top" />
                    <PageStackArc edge="bottom" />
                    {/* Left page */}
                    <div
                      className="absolute top-0 bottom-0 z-[2]"
                      style={{
                        left: leftStack,
                        right: "50%",
                        paddingRight: 6,
                        transform: "rotateY(3.5deg)",
                        transformOrigin: "right center",
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                        willChange: "transform",
                      }}
                    >
                      <PageCurve side="right" />
                      <div
                        className="relative h-full overflow-hidden"
                        style={{ clipPath: PAGE_ARC_CLIP_LEFT }}
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
                        transform: "rotateY(-3.5deg)",
                        transformOrigin: "left center",
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                        willChange: "transform",
                      }}
                    >
                      <PageCurve side="left" />
                      <div
                        className="relative h-full overflow-hidden"
                        style={{ clipPath: PAGE_ARC_CLIP_RIGHT }}
                      >
                        {rightPage}
                        <PageEdgeShading side="right" />
                      </div>
                    </div>
                    {/* Gutter — deep central shadow (binding) */}
                    <div
                      className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[78px] pointer-events-none z-[3]"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, hsl(0 0% 0% / 0.18) 28%, hsl(0 0% 0% / 0.42) 50%, hsl(0 0% 0% / 0.18) 72%, transparent 100%)",
                      }}
                    />
                    {/* Crisp center crease */}
                    <div
                      className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px pointer-events-none z-[3]"
                      style={{ background: "hsl(0 0% 0% / 0.5)" }}
                    />
                    {/* Tiny highlight along the very edge of each page meeting
                        the gutter — the bowed sheet catches a hair of light */}
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-[3]"
                      style={{
                        left: "calc(50% - 1px)",
                        width: 1,
                        background: "hsl(40 60% 92% / 0.18)",
                      }}
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

              {/* Tabs — anchored to the PAGE-BLOCK edge so each tab can
                  straddle the page edge: a few px overlap onto the page
                  (looks clipped on) while the rest juts into the leather
                  gutter. The page block sits at inset 10px from the cover. */}
              {renderTabs && (!isMobile || pageSide === "left") && (
                <div
                  className="absolute top-0 bottom-0 z-[7] pointer-events-none"
                  style={{ left: 10 }}
                >
                  {renderTabs("left")}
                </div>
              )}
              {renderTabs && (!isMobile || pageSide === "right") && (
                <div
                  className="absolute top-0 bottom-0 z-[7] pointer-events-none"
                  style={{ right: 10 }}
                >
                  {renderTabs("right")}
                </div>
              )}
              {/* Ribbons */}
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
    </div>
  );
}

function PageCurve({ side }: { side: "left" | "right" }) {
  return (
    <>
      {/* Spine-side shadow — page dips into the gutter (deeper now) */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-[3]"
        style={{
          [side]: 0,
          width: 70,
          background:
            side === "right"
              ? "linear-gradient(270deg, hsl(0 0% 0% / 0.42) 0%, hsl(0 0% 0% / 0.16) 50%, transparent 100%)"
              : "linear-gradient(90deg, hsl(0 0% 0% / 0.42) 0%, hsl(0 0% 0% / 0.16) 50%, transparent 100%)",
        }}
      />
      {/* Outer-edge highlight — closest to the eye */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none z-[3]"
        style={{
          [side === "right" ? "left" : "right"]: 0,
          width: 80,
          background:
            side === "right"
              ? "linear-gradient(90deg, hsl(40 60% 96% / 0.5) 0%, transparent 100%)"
              : "linear-gradient(270deg, hsl(40 60% 96% / 0.5) 0%, transparent 100%)",
          mixBlendMode: "screen",
        }}
      />
    </>
  );
}

/**
 * Visible cumulative top/bottom edges of the page block — fine arched lines
 * matching the top page's curve, fanning a few px deeper at the outer
 * corners. Quieter and denser than before so it reads as compressed mass,
 * not stripes.
 */
function PageStackArc({ edge }: { edge: "top" | "bottom" }) {
  const SHEETS = 14;
  const BAND_PX = 16;
  const OVERHANG_PX = 2;
  const VW = 1000;
  const VH = BAND_PX + OVERHANG_PX;
  const isTop = edge === "top";

  const paths: { d: string; opacity: number; stroke: string; w: number }[] = [];
  for (let i = 0; i < SHEETS; i++) {
    const t = i / (SHEETS - 1);
    const outerDip =
      (TOP_PAGE_OUTER_DIP_PX + t * STACK_FAN_PX) * (VH / (BAND_PX + OVERHANG_PX));
    const spineY = isTop ? OVERHANG_PX : VH - OVERHANG_PX;
    const outerY = isTop ? OVERHANG_PX + outerDip : VH - OVERHANG_PX - outerDip;

    const samples = CURVE_SAMPLES;
    const pts: string[] = [];
    for (let s = 0; s <= samples; s++) {
      const x = (s / samples) * VW;
      const dipFrac = dipFraction(Math.abs(x - VW / 2) / (VW / 2));
      const y = isTop
        ? spineY + (outerY - spineY) * dipFrac
        : spineY - (spineY - outerY) * dipFrac;
      pts.push(`${x.toFixed(2)},${y.toFixed(3)}`);
    }
    const d = `M ${pts.join(" L ")}`;

    // Compressed mass: most lines are very faint and similar in tone, with
    // just a few accent lines. This reads as paper, not stripes.
    const lightness = 68 - t * 30;
    const sat = 60 - t * 22;
    const stroke = `hsl(${36 + t * 4} ${sat}% ${lightness}%)`;
    const opacity = i === 0 ? 0.9 : 0.18 + (1 - t) * 0.22;
    paths.push({ d, opacity, stroke, w: i === 0 ? 0.8 : 0.45 });
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
          filter: isTop
            ? "drop-shadow(0 1px 0.5px hsl(28 35% 22% / 0.5))"
            : "drop-shadow(0 -1px 0.5px hsl(28 35% 22% / 0.5))",
        }}
      >
        <defs>
          <linearGradient
            id={`stack-arc-wash-${edge}`}
            x1="0"
            y1={isTop ? 0 : VH}
            x2="0"
            y2={isTop ? VH : 0}
          >
            <stop offset="0%" stopColor="hsl(40 70% 62%)" stopOpacity="0.0" />
            <stop offset="40%" stopColor="hsl(36 60% 50%)" stopOpacity="0.65" />
            <stop offset="100%" stopColor="hsl(28 45% 30%)" stopOpacity="0.9" />
          </linearGradient>
          <clipPath id={`stack-arc-clip-${edge}`}>
            <path
              d={
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
            strokeWidth={p.w}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

function stackBackground(side: "left" | "right") {
  // Side gilt edge — the visible compressed mass of pages from outside.
  // `outward` runs FROM the spine TO the outer edge; `inward` is the reverse.
  const outward = side === "left" ? "270deg" : "90deg";
  const inward = side === "left" ? "90deg" : "270deg";

  // Very fine "individual sheets" striations.
  const sheets = `repeating-linear-gradient(${outward},
    hsl(38 50% 56% / 0.95) 0 0.5px,
    hsl(42 70% 68% / 0.85) 0.5px 1.1px,
    hsl(34 45% 42% / 0.55) 1.1px 1.4px,
    hsl(40 60% 60% / 0.85) 1.4px 2.2px)`;

  // Wider, irregular darker bands — uneven page heights / shadow lines.
  const bands = `repeating-linear-gradient(${outward},
    transparent 0 7px,
    hsl(28 35% 28% / 0.22) 7px 7.4px,
    transparent 7.4px 17px,
    hsl(28 35% 28% / 0.14) 17px 17.3px)`;

  // Warm gold base, compressed (darker) toward the spine — wedge-feel.
  const gilt = `linear-gradient(${inward},
    hsl(38 78% 60%) 0%,
    hsl(40 68% 52%) 30%,
    hsl(34 50% 36%) 70%,
    hsl(20 30% 14%) 100%)`;

  return `${bands}, ${sheets}, ${gilt}`;
}

function PageEdgeShading({ side }: { side: "left" | "right" }) {
  const outer = side === "left" ? "270deg" : "90deg";
  return (
    <>
      <div
        aria-hidden
        className="absolute left-0 right-0 top-0 pointer-events-none z-[4]"
        style={{
          height: 16,
          background:
            "linear-gradient(180deg, hsl(0 0% 0% / 0.20) 0%, hsl(0 0% 0% / 0.06) 55%, transparent 100%)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        aria-hidden
        className="absolute left-0 right-0 bottom-0 pointer-events-none z-[4]"
        style={{
          height: 18,
          background:
            "linear-gradient(0deg, hsl(0 0% 0% / 0.24) 0%, hsl(0 0% 0% / 0.08) 55%, transparent 100%)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 bottom-0 pointer-events-none z-[4]"
        style={{
          [side === "left" ? "left" : "right"]: 0,
          width: 28,
          background: `linear-gradient(${outer}, hsl(0 0% 0% / 0.12) 0%, transparent 100%)`,
          mixBlendMode: "multiply",
        }}
      />
    </>
  );
}
