import { spreadPageStackWidths } from "@/lib/bible/readerPageMargins";
import { spreadCropLeftInsetCss, spreadCropWidthCss, SPREAD_RIGHT_PEEK } from "@/lib/bible/spreadCrop";
import { PageStackEdge } from "@/components/bible/PageStackEdge";
import { cn } from "@/lib/utils";
import { isInsideMiniPhoneApp } from "@/lib/mini-phone/miniPhoneLayoutViewport";
import { type CSSProperties, type ReactNode } from "react";

interface Props {
  /** 0 = first page of Genesis, 1 = last page of Revelation */
  progress: number;
  leftPage: ReactNode;
  rightPage: ReactNode;
  /** Narrow viewport — crop spread to focus left page with a sliver of the right. */
  singlePage?: boolean;
  /** iPad portrait — centered, narrower cover frame. */
  tabletPortrait?: boolean;
  /** Fill parent height (hub workspace) instead of viewport height. */
  fillContainer?: boolean;
  /** Fabric shows through around the leather cover (hub reader). */
  fabricSurround?: boolean;
  /** Embedded in hub card beside sidebar — tighter inset, not fullscreen overlay. */
  hubInline?: boolean;
  ribbons?: ReactNode;
  /** User-selected leather cover (CSS variables). */
  coverStyle?: CSSProperties;
  coverClassName?: string;
  /** Page tone / reader theme classes on the paper surface. */
  pageClassName?: string;
  /** Cropped spread — nudge the open book right on interior pages (more right-page peek). */
  spreadNudgeRight?: boolean;
}

const coverRadiusLeft = (hubInline: boolean) => (hubInline ? "0.5rem" : "0.75rem");

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
  fabricSurround = false,
  hubInline = false,
  ribbons,
  coverStyle,
  coverClassName,
  pageClassName,
  spreadNudgeRight = false,
}: Props) {
  const croppedSpread = singlePage;
  const stackWidths = spreadPageStackWidths(progress);
  const { left: leftStack, right: rightStack } = stackWidths;

  const coverPadX = croppedSpread ? (tabletPortrait ? 14 : hubInline ? 6 : 10) : 14;
  const coverPadTop = croppedSpread ? (tabletPortrait ? 14 : hubInline ? 4 : 12) : 16;
  const coverPadBottom = croppedSpread ? (tabletPortrait ? 12 : hubInline ? 4 : 10) : 14;
  const flushMobile = hubInline || (fillContainer && croppedSpread);
  const leftInset = spreadCropLeftInsetCss(hubInline, tabletPortrait);
  const leftRadius = coverRadiusLeft(hubInline);

  const coverChrome = (
    <>
      {/* Subtle sheen across the cover */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          borderTopLeftRadius: leftRadius,
          borderBottomLeftRadius: leftRadius,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          backgroundImage:
            "linear-gradient(115deg, transparent 0%, hsl(var(--lc-light) / 0.12) 38%, hsl(var(--lc-highlight) / 0.14) 50%, transparent 100%)",
          mixBlendMode: "screen",
        }}
        aria-hidden
      />

      <div
        className="relative z-[2] flex flex-col flex-1 min-h-0 overflow-visible"
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
            className={cn(
              "relative flex flex-1 min-h-0 min-w-0 overflow-hidden bg-paper",
              pageClassName,
            )}
          >
            <div
              className="relative flex h-full min-h-0 min-w-0 w-full flex-row"
              data-reader-spread=""
              style={
                croppedSpread && spreadNudgeRight
                  ? { transform: "translateX(clamp(0.5rem, 2.5vw, 0.875rem))" }
                  : undefined
              }
            >
              <div className="relative flex flex-1 min-h-0 min-w-0 border-r border-border/40">
                <PageStackEdge side="left" widthPx={leftStack} />
                <div
                  className="relative flex-1 min-h-0 min-w-0 overflow-hidden"
                  style={{ marginLeft: leftStack }}
                >
                  {leftPage}
                </div>
              </div>

              <div
                className={cn(
                  "relative flex flex-1 min-h-0 min-w-0 flex flex-row-reverse",
                  croppedSpread && "pointer-events-none select-none",
                )}
              >
                <PageStackEdge side="right" widthPx={rightStack} />
                <div
                  className="relative flex-1 min-h-0 min-w-0 overflow-hidden"
                  style={{ marginRight: rightStack }}
                >
                  {rightPage}
                </div>
              </div>

              <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-[6]"
                style={{
                  width: "clamp(10px, 1.8vmin, 22px)",
                  background:
                    "linear-gradient(90deg, hsl(0 0% 0% / 0.12) 0%, hsl(0 0% 0% / 0.04) 38%, hsl(0 0% 0% / 0.1) 50%, hsl(0 0% 0% / 0.04) 62%, hsl(0 0% 0% / 0.12) 100%)",
                  boxShadow:
                    "-14px 0 22px -12px hsl(0 0% 0% / 0.14), 14px 0 22px -12px hsl(0 0% 0% / 0.14)",
                }}
              />

              {ribbons ? (
                <div className="absolute inset-0 z-[8] pointer-events-none overflow-visible">
                  {ribbons}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      data-cropped-spread={croppedSpread ? "" : undefined}
      className={cn(
        "relative w-full flex flex-col",
        croppedSpread ? "items-stretch overflow-x-hidden" : "items-center",
        fillContainer ? "h-full min-h-0 flex-1" : "h-[100dvh]",
      )}
      style={{ background: fabricSurround ? "transparent" : "hsl(0 0% 100%)" }}
    >
      {croppedSpread ? (
        <div
          className={cn(
            "relative z-10 flex min-h-0 w-full flex-1 flex-col overflow-x-hidden",
            !fabricSurround && "max-w-none w-screen",
            hubInline
              ? "pb-[env(safe-area-inset-bottom,0px)]"
              : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div
            className={cn(
              "reader-leather-cover reader-leather-cover--bleed-right leather-cover-surface absolute inset-y-0 left-0 flex min-h-0 flex-col overflow-hidden",
              coverClassName,
            )}
            style={{
              ...coverStyle,
              width: spreadCropWidthCss(SPREAD_RIGHT_PEEK, hubInline, leftInset),
              marginLeft: leftInset,
              borderTopLeftRadius: leftRadius,
              borderBottomLeftRadius: leftRadius,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            {coverChrome}
          </div>
        </div>
      ) : (
        <div
          className="relative z-10 w-full flex flex-col flex-1 min-h-0"
          style={{ maxWidth: isInsideMiniPhoneApp() ? "100%" : "min(1420px, 98vw)" }}
        >
          <div
            className={cn(
              "flex flex-col flex-1 min-h-0 w-full",
              hubInline
                ? "pt-0 pb-[env(safe-area-inset-bottom,0px)]"
                : cn(
                    "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
                    flushMobile ? "pt-1" : "pt-[max(0.5rem,env(safe-area-inset-top))]",
                  ),
              tabletPortrait ? "px-4" : hubInline ? "px-0" : "px-2 sm:px-3",
            )}
          >
            <div
              className={cn(
                "reader-leather-cover leather-cover-surface relative flex flex-col flex-1 min-h-0 overflow-hidden",
                hubInline ? "rounded-lg" : "rounded-xl",
                coverClassName,
              )}
              style={coverStyle}
            >
              {coverChrome}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
