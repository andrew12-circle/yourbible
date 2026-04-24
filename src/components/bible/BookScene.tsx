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
  const totalStack = 18;
  const leftStack = Math.max(2, Math.round(totalStack * progress));
  const rightStack = Math.max(2, Math.round(totalStack * (1 - progress)));

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
            className="relative rounded-[10px] p-[12px] sm:p-[16px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7),0_10px_20px_-10px_rgba(0,0,0,0.5)]"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 30% 20%, hsl(0 50% 28% / 0.55) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, hsl(0 60% 10% / 0.55) 0%, transparent 55%), linear-gradient(135deg, hsl(0 55% 14%) 0%, hsl(0 48% 22%) 50%, hsl(0 55% 12%) 100%)",
            }}
          >
            <div
              className="absolute inset-0 rounded-[10px] pointer-events-none mix-blend-overlay opacity-60"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, hsl(0 0% 0% / 0.08) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, hsl(0 0% 100% / 0.05) 0 1px, transparent 1px 5px)",
              }}
            />
            <div
              className="absolute inset-1.5 rounded-[8px] pointer-events-none"
              style={{
                border: "1px solid hsl(38 58% 52% / 0.35)",
                boxShadow: "inset 0 0 0 1px hsl(0 0% 0% / 0.3)",
              }}
            />

            <PageStackEdge side="top" leftStack={leftStack} rightStack={rightStack} mobile={isMobile} />
            <PageStackEdge side="bottom" leftStack={leftStack} rightStack={rightStack} mobile={isMobile} />

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

              {!isMobile && ribbons}

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
  return (
    <div
      className="absolute pointer-events-none flex"
      style={{
        left: inset,
        right: inset,
        height: 6,
        [side]: inset / 2,
        background: side === "top" ? gradient : flipped,
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
      <div className="h-full" style={{ width: leftStack, background: "hsl(38 30% 80%)", opacity: 0.5 }} />
      <div className="flex-1" />
      <div className="h-full" style={{ width: rightStack, background: "hsl(38 30% 80%)", opacity: 0.5 }} />
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
  const dir = side === "left" ? "90deg" : "270deg";
  const lines = `repeating-linear-gradient(${dir}, hsl(var(--paper-edge)) 0 1px, hsl(var(--paper)) 1px 2px)`;
  const fade = `linear-gradient(${dir}, hsl(var(--paper-deep)) 0%, hsl(var(--paper-edge)) 70%, transparent 100%)`;
  return `${fade}, ${lines}`;
}
