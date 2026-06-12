import type { CSSProperties, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { readerColumnClassName } from "@/lib/bible/readerColumnLayout";
import { scriptureColumnWrapperStyle } from "@/lib/bible/readerColumnMeasure";
import { spreadOverlayForeEdgeStackPx, spreadOverlayPanePadding } from "@/lib/bible/readerPageMargins";
import { cn } from "@/lib/utils";

interface Props {
  leftContent: ReactNode;
  rightContent: ReactNode;
  pageStackLeftPx?: number;
  pageStackRightPx?: number;
  columnHeightPx?: number;
  className?: string;
  typographyStyle?: CSSProperties;
  busy?: boolean;
}

/**
 * Renders scripture in two facing panes (col1 → col2 | col3 → col4) with the same
 * outer and spine gutters as the live page surfaces.
 */
export function SpreadScriptureOverlay({
  leftContent,
  rightContent,
  pageStackLeftPx = 0,
  pageStackRightPx = 0,
  columnHeightPx,
  className,
  typographyStyle,
  busy = false,
}: Props) {
  const columnsClass = readerColumnClassName("double");
  const foreEdgeStackPx = spreadOverlayForeEdgeStackPx(pageStackLeftPx, pageStackRightPx);
  const columnStyle: CSSProperties = {
    ...scriptureColumnWrapperStyle(
      columnHeightPx && columnHeightPx > 0 ? columnHeightPx : 520,
    ),
    columns: 2,
    columnCount: 2,
    WebkitColumnCount: 2,
  };

  const renderPane = (side: "left" | "right", content: ReactNode) => (
    <div
      className="flex flex-1 min-w-0 flex-col min-h-0 pointer-events-none"
      style={spreadOverlayPanePadding(side, foreEdgeStackPx)}
    >
      <article
        data-reading-area
        data-spread-scripture={side}
        aria-busy={busy}
        className={cn(
          "flex-1 min-h-0 w-full overflow-hidden selectable-text pointer-events-auto",
          className,
        )}
        style={typographyStyle}
      >
        {columnsClass ? (
          <div className={cn(columnsClass, "h-full min-h-0 w-full")} style={columnStyle}>
            {busy ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-leather/50" />
              </div>
            ) : (
              content
            )}
          </div>
        ) : (
          content
        )}
      </article>
    </div>
  );

  return (
    <div
      data-reader-spread-overlay
      className="absolute inset-x-0 z-[4] flex flex-row min-h-0 pointer-events-none"
      style={{
        top: "2.5rem",
        bottom: "3rem",
      }}
      aria-hidden={false}
    >
      {renderPane("left", leftContent)}
      {renderPane("right", rightContent)}
    </div>
  );
}
