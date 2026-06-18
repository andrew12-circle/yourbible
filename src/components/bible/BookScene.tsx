import { spreadPageStackWidths } from "@/lib/bible/readerPageMargins";
import { PageStackEdge } from "@/components/bible/PageStackEdge";
import { cn } from "@/lib/utils";
import { type CSSProperties, type ReactNode } from "react";

interface Props {
  /** 0 = first page of Genesis, 1 = last page of Revelation */
  progress: number;
  leftPage: ReactNode;
  rightPage: ReactNode;
  /** One page at a time (phones / narrow tablet). */
  singlePage?: boolean;
  /** iPad portrait — single page with centered, narrower spread. */
  tabletPortrait?: boolean;
  /** Fill parent height (hub workspace) instead of viewport height. */
  fillContainer?: boolean;
  pageSide?: "left" | "right";
  ribbons?: ReactNode;
  /** User-selected leather cover (CSS variables). */
  coverStyle?: CSSProperties;
  coverClassName?: string;
  /** Page tone / reader theme classes on the paper surface. */
  pageClassName?: string;
}

const LEATHER_BG = {
  backgroundImage:
    `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),` +
    `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.05  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"),` +
    "radial-gradient(ellipse 70% 35% at 50% 0%, hsl(10 70% 38% / 0.5) 0%, transparent 70%)," +
    "radial-gradient(ellipse 60% 30% at 50% 100%, hsl(0 0% 0% / 0.55) 0%, transparent 70%)," +
    "linear-gradient(150deg, hsl(0 45% 16%) 0%, hsl(0 50% 24%) 35%, hsl(0 55% 20%) 60%, hsl(0 60% 12%) 100%)",
  backgroundBlendMode: "overlay, multiply, screen, multiply, normal",
} as const;

const MOBILE_SPINE_W = 20;

/** Leather spine strip on the outer edge of a single-page mobile view. */
function MobileBookSpine({ coverStyle }: { coverStyle?: CSSProperties }) {
  return (
    <>
      <div
        aria-hidden
        className="absolute top-0 bottom-0 right-0 z-[3] pointer-events-none"
        style={{
          width: 28,
          background:
            "linear-gradient(270deg, hsl(0 0% 0% / 0.16) 0%, hsl(0 0% 0% / 0.07) 38%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 bottom-0 right-0 z-[5] pointer-events-none overflow-hidden"
        style={{
          width: MOBILE_SPINE_W,
          ...LEATHER_BG,
          ...coverStyle,
          boxShadow:
            "-10px 0 22px -8px hsl(0 0% 0% / 0.42), " +
            "inset 2px 0 0 hsl(38 58% 52% / 0.55), " +
            "inset -1px 0 6px hsl(0 0% 0% / 0.45)",
        }}
      >
        <div
          className="absolute inset-y-0 left-[28%] w-[44%] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(10 50% 28% / 0.65) 45%, hsl(20 60% 42% / 0.2) 70%, transparent 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-0 w-px pointer-events-none"
          style={{ background: "hsl(38 58% 52% / 0.65)" }}
          aria-hidden
        />
      </div>
    </>
  );
}

/**
 * Digital reading layout with a full leather cover frame (top, sides, bottom)
 * wrapping the paper spread.
 */
export function BookScene({
  progress,
  leftPage,
  rightPage,
  singlePage = false,
  tabletPortrait = false,
  fillContainer = false,
  pageSide = "left",
  ribbons,
  coverStyle,
  coverClassName,
  pageClassName,
}: Props) {
  const showLeft = !singlePage || pageSide === "left";
  const showRight = !singlePage || pageSide === "right";

  const totalStack = singlePage ? 26 : 44;
  const minStack = singlePage ? 12 : 20;
  const stackWidths = spreadPageStackWidths(progress);
  const leftStack = singlePage
    ? Math.max(minStack, Math.round(totalStack * progress))
    : stackWidths.left;
  const rightStack = singlePage
    ? Math.max(minStack, Math.round(totalStack * (1 - progress)))
    : stackWidths.right;

  const coverPadX = singlePage ? (tabletPortrait ? 14 : 10) : 14;
  const coverPadTop = singlePage ? (tabletPortrait ? 14 : 12) : 16;
  const coverPadBottom = singlePage ? (tabletPortrait ? 12 : 10) : 14;

  return (
    <div
      className={
        "relative w-full flex flex-col items-center " +
        (fillContainer ? "h-full min-h-0 flex-1" : "h-[100dvh]")
      }
      style={{ background: "hsl(0 0% 100%)" }}
    >
      <div
        className="relative z-10 w-full flex flex-col flex-1 min-h-0"
        style={{
          maxWidth: singlePage
            ? tabletPortrait
              ? "min(720px, 92vw)"
              : "100%"
            : "min(1420px, 98vw)",
        }}
      >
        <div
          className={
            "flex flex-col flex-1 min-h-0 w-full pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] " +
            (tabletPortrait ? "px-4" : "px-2 sm:px-3")
          }
        >
          {/* Leather cover — visible on top, left, right, and bottom */}
          <div
            className={cn("relative flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden", coverClassName)}
            style={{
              ...LEATHER_BG,
              ...coverStyle,
              boxShadow:
                "0 20px 48px -16px hsl(0 0% 0% / 0.45), " +
                "0 6px 16px -6px hsl(0 0% 0% / 0.35), " +
                "inset 0 2px 0 hsl(0 60% 30% / 0.35), " +
                "inset 0 -3px 10px hsl(0 0% 0% / 0.4)",
            }}
          >
            {/* Subtle sheen across the cover */}
            <div
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, transparent 0%, hsl(20 60% 60% / 0.07) 38%, hsl(30 70% 70% / 0.10) 50%, transparent 100%)",
                mixBlendMode: "screen",
              }}
              aria-hidden
            />

            <div
              className="relative flex flex-col flex-1 min-h-0 overflow-visible"
              style={{
                padding: `${coverPadTop}px ${coverPadX}px ${coverPadBottom}px`,
              }}
            >
              {/* Gold rule between cover and pages */}
              <div
                className="relative flex flex-1 flex-col min-h-0 rounded-[5px] overflow-hidden"
                style={{
                  boxShadow:
                    "inset 0 0 0 1px hsl(38 58% 52% / 0.5), " +
                    "inset 0 0 0 2px hsl(0 0% 0% / 0.25), " +
                    "0 1px 0 hsl(12 35% 28% / 0.4)",
                }}
              >
                <div
                  className={
                    "relative flex flex-1 min-h-0 min-w-0 overflow-hidden bg-paper " +
                    (pageClassName ?? "") +
                    " " +
                    (singlePage ? "" : "flex-row")
                  }
                >
                  {singlePage ? (
                    <div className="relative flex flex-1 min-h-0 min-w-0">
                      <PageStackEdge side="left" widthPx={leftStack} />
                      <div
                        className="relative flex-1 min-h-0 min-w-0 overflow-hidden"
                        style={{
                          marginLeft: leftStack,
                          marginRight: MOBILE_SPINE_W,
                        }}
                      >
                        {pageSide === "left" ? leftPage : rightPage}
                      </div>
                      <MobileBookSpine coverStyle={coverStyle} />
                    </div>
                  ) : (
                    <>
                      {showLeft && (
                        <div className="relative flex-1 min-h-0 min-w-0 flex border-r border-border/40">
                          <PageStackEdge side="left" widthPx={leftStack} />
                          <div
                            className="relative flex-1 min-h-0 min-w-0 overflow-hidden"
                            style={{ marginLeft: leftStack }}
                          >
                            {leftPage}
                          </div>
                        </div>
                      )}
                      {showRight && (
                        <div className="relative flex-1 min-h-0 min-w-0 flex flex-row-reverse">
                          <PageStackEdge side="right" widthPx={rightStack} />
                          <div
                            className="relative flex-1 min-h-0 min-w-0 overflow-hidden"
                            style={{ marginRight: rightStack }}
                          >
                            {rightPage}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {ribbons && (
                    <div className="absolute inset-0 z-[8] pointer-events-none overflow-visible">
                      {ribbons}
                    </div>
                  )}

                  {!singlePage && (
                    <div
                      className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 pointer-events-none z-[1]"
                      style={{
                        boxShadow:
                          "-10px 0 18px -8px hsl(0 0% 0% / 0.05), 10px 0 18px -8px hsl(0 0% 0% / 0.05)",
                        background: "hsl(var(--border) / 0.35)",
                      }}
                    />
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
