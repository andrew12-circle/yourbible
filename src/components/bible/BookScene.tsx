import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Slot for the right-edge book tabs (rendered inside the paper stack) */
  tabs?: ReactNode;
  /** Slot for the spine ribbon(s) */
  ribbons?: ReactNode;
}

/**
 * Renders the open-Bible scene: dark wood table, leather cover peeking out
 * around the edges, two cream pages with a central spine, gilded edges, and
 * a paper stack on the right where the thumb-index tabs live.
 *
 * Children render INSIDE the page area (use CSS columns for two-page text).
 */
export function BookScene({ children, tabs, ribbons }: Props) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        // Wood / table backdrop
        background:
          "radial-gradient(ellipse at 50% 30%, hsl(28 28% 18%) 0%, hsl(24 24% 10%) 60%, hsl(20 20% 6%) 100%)",
      }}
    >
      {/* Subtle wood grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(92deg, hsl(30 40% 30% / 0.5) 0 1px, transparent 1px 6px), repeating-linear-gradient(2deg, hsl(20 30% 14% / 0.4) 0 1px, transparent 1px 9px)",
        }}
      />

      {/* The book itself — sits centered on the table */}
      <div className="relative z-10 mx-auto" style={{ maxWidth: "min(1200px, 96vw)" }}>
        <div className="pt-6 sm:pt-10 pb-10">
          {/* Outer leather cover — visible as a thin band around the pages */}
          <div
            className="relative rounded-[10px] p-[10px] sm:p-[14px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7),0_10px_20px_-10px_rgba(0,0,0,0.5)]"
            style={{
              background:
                "linear-gradient(135deg, hsl(0 55% 14%) 0%, hsl(0 48% 22%) 50%, hsl(0 55% 12%) 100%)",
              backgroundImage:
                "radial-gradient(ellipse at 30% 20%, hsl(0 50% 28% / 0.55) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, hsl(0 60% 10% / 0.55) 0%, transparent 55%), linear-gradient(135deg, hsl(0 55% 14%) 0%, hsl(0 48% 22%) 50%, hsl(0 55% 12%) 100%)",
            }}
          >
            {/* Cover grain texture */}
            <div
              className="absolute inset-0 rounded-[10px] pointer-events-none mix-blend-overlay opacity-60"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, hsl(0 0% 0% / 0.08) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, hsl(0 0% 100% / 0.05) 0 1px, transparent 1px 5px)",
              }}
            />
            {/* Gold cover border */}
            <div
              className="absolute inset-1 rounded-[8px] pointer-events-none"
              style={{
                border: "1px solid hsl(38 58% 52% / 0.35)",
                boxShadow: "inset 0 0 0 1px hsl(0 0% 0% / 0.3)",
              }}
            />

            {/* Page-stack edges — gilded gold */}
            {/* Top edge */}
            <div
              className="absolute left-[10px] right-[10px] sm:left-[14px] sm:right-[14px] top-[6px] sm:top-[10px] h-[4px] rounded-t-sm pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, hsl(38 58% 52%) 0%, hsl(42 78% 62%) 50%, hsl(32 48% 38%) 100%)",
                boxShadow: "inset 0 -1px 0 hsl(0 0% 0% / 0.25)",
              }}
            />
            {/* Bottom edge */}
            <div
              className="absolute left-[10px] right-[10px] sm:left-[14px] sm:right-[14px] bottom-[6px] sm:bottom-[10px] h-[4px] rounded-b-sm pointer-events-none"
              style={{
                background:
                  "linear-gradient(0deg, hsl(38 58% 52%) 0%, hsl(42 78% 62%) 50%, hsl(32 48% 38%) 100%)",
                boxShadow: "inset 0 1px 0 hsl(0 0% 0% / 0.25)",
              }}
            />

            {/* The two pages */}
            <div
              className="relative paper-texture rounded-[4px] overflow-hidden"
              style={{
                boxShadow:
                  "inset 0 0 60px hsl(30 30% 60% / 0.25), inset 0 0 0 1px hsl(var(--paper-edge))",
                minHeight: "calc(100vh - 80px)",
              }}
            >
              {/* Left page edge stack (the closed pages on the left) */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[6px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--paper-deep)) 0%, hsl(var(--paper-edge)) 60%, transparent 100%)",
                }}
              />
              {/* Right page edge stack (where tabs poke out) */}
              <div
                className="absolute right-0 top-0 bottom-0 w-[14px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(270deg, hsl(var(--paper-deep)) 0%, hsl(var(--paper-edge)) 50%, transparent 100%)",
                  boxShadow: "inset -1px 0 0 hsl(var(--paper-deep))",
                }}
              />

              {/* Center spine + gutter shadow */}
              <div
                className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[64px] pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(0 0% 0% / 0.18) 35%, hsl(0 0% 0% / 0.28) 50%, hsl(0 0% 0% / 0.18) 65%, transparent 100%)",
                }}
              />
              {/* Sharp center crease */}
              <div
                className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px pointer-events-none"
                style={{ background: "hsl(0 0% 0% / 0.35)" }}
              />

              {/* Spine ribbons (drape down the gutter) */}
              {ribbons}

              {/* Page content */}
              <div className="relative z-[2] h-full">
                {children}
              </div>

              {/* Tabs — anchored to right paper-stack edge */}
              {tabs}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
