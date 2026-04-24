import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const totalStack = isMobile ? 22 : 32;
  const leftStack = Math.max(10, Math.round(totalStack * progress));
  const rightStack = Math.max(10, Math.round(totalStack * (1 - progress)));

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
                  {/* Left page */}
                  <div
                    className="absolute top-0 bottom-0 z-[2]"
                    style={{ left: leftStack, right: "50%", paddingRight: 6 }}
                  >
                    <PageCurve side="right" />
                    <div className="relative h-full overflow-hidden">{leftPage}</div>
                  </div>
                  {/* Right page */}
                  <div
                    className="absolute top-0 bottom-0 z-[2]"
                    style={{ left: "50%", right: rightStack, paddingLeft: 6 }}
                  >
                    <PageCurve side="left" />
                    <div className="relative h-full overflow-hidden">{rightPage}</div>
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

              {/* === Tabs — render on OUTER edges === */}
              {renderTabs && (!isMobile || pageSide === "left") && (
                <div
                  className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                  style={{ left: 0, width: leftStack }}
                >
                  {renderTabs("left")}
                </div>
              )}
              {renderTabs && (!isMobile || pageSide === "right") && (
                <div
                  className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                  style={{ right: 0, width: rightStack }}
                >
                  {renderTabs("right")}
                </div>
              )}
            </div>
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

function PageStackEdge({
  side,
  leftStack,
  rightStack,
  mobile,
}: {
  side: "top" | "bottom";
  leftStack: number;
  rightStack: number;
  mobile: boolean;
}) {
  const gradient =
    "linear-gradient(180deg, hsl(38 58% 52%) 0%, hsl(42 78% 62%) 50%, hsl(32 48% 38%) 100%)";
  const flipped =
    "linear-gradient(0deg, hsl(38 58% 52%) 0%, hsl(42 78% 62%) 50%, hsl(32 48% 38%) 100%)";
  const inset = mobile ? 12 : 16;
  const pageMarks = `repeating-linear-gradient(90deg,
    hsl(0 0% 0% / 0.18) 0 0.5px,
    transparent 0.5px 2.3px,
    hsl(0 0% 0% / 0.10) 2.3px 2.7px,
    transparent 2.7px 5.1px)`;
  const sideStripes = `repeating-linear-gradient(90deg,
    hsl(38 30% 78%) 0 0.6px,
    hsl(38 22% 62%) 0.6px 1.4px,
    hsl(38 30% 80%) 1.4px 2.2px)`;
  return (
    <div
      className="absolute pointer-events-none flex"
      style={{
        left: inset,
        right: inset,
        height: 6,
        [side]: inset / 2,
        backgroundImage: `${pageMarks}, ${side === "top" ? gradient : flipped}`,
        boxShadow:
          side === "top"
            ? "inset 0 -1px 0 hsl(0 0% 0% / 0.3)"
            : "inset 0 1px 0 hsl(0 0% 0% / 0.3)",
        borderTopLeftRadius: side === "top" ? 2 : 0,
        borderTopRightRadius: side === "top" ? 2 : 0,
        borderBottomLeftRadius: side === "bottom" ? 2 : 0,
        borderBottomRightRadius: side === "bottom" ? 2 : 0,
      }}
    >
      <div className="h-full" style={{ width: leftStack, backgroundImage: sideStripes, opacity: 0.7 }} />
      <div className="flex-1" />
      <div className="h-full" style={{ width: rightStack, backgroundImage: sideStripes, opacity: 0.7 }} />
    </div>
  );
}

function PageCurve({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-[2]"
      style={{
        [side]: 0,
        width: 24,
        background:
          side === "right"
            ? "linear-gradient(270deg, hsl(0 0% 0% / 0.15) 0%, transparent 100%)"
            : "linear-gradient(90deg, hsl(0 0% 0% / 0.15) 0%, transparent 100%)",
      }}
    />
  );
}

function stackBackground(side: "left" | "right") {
  // Build an organic, slightly irregular stack of pages.
  // Mix multiple striation passes with different periods so it never reads as a perfect ruler.
  const dir = side === "left" ? "90deg" : "270deg";
  const inward = side === "left" ? "90deg" : "270deg";
  const stripesA = `repeating-linear-gradient(${dir},
    hsl(var(--paper-edge) / 0.95) 0 0.6px,
    hsl(var(--paper) / 0.85) 0.6px 1.7px,
    hsl(var(--paper-deep) / 0.55) 1.7px 2.1px,
    hsl(var(--paper) / 0.9) 2.1px 3.3px)`;
  const stripesB = `repeating-linear-gradient(${dir},
    transparent 0 5px,
    hsl(0 0% 0% / 0.10) 5px 5.4px,
    transparent 5.4px 11px,
    hsl(0 0% 0% / 0.06) 11px 11.3px)`;
  const stripesC = `repeating-linear-gradient(${dir},
    transparent 0 19px,
    hsl(30 18% 35% / 0.18) 19px 19.6px,
    transparent 19.6px 33px)`;
  // soft warm shading deeper toward the spine (inner edge)
  const shade = `linear-gradient(${inward},
    hsl(var(--paper-deep)) 0%,
    hsl(30 22% 70%) 35%,
    hsl(38 28% 78%) 70%,
    hsl(0 0% 0% / 0.22) 100%)`;
  return `${stripesC}, ${stripesB}, ${stripesA}, ${shade}`;
}
