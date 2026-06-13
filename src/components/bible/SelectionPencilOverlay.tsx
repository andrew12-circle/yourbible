import { useEffect, useState } from "react";

/**
 * Renders a dashed pencil underline beneath every line of the current
 * window text selection. It tracks `selectionchange` and updates the rects.
 * Purely cosmetic — does not interfere with selection, clicks, or scrolling.
 */
type Props = {
  /** When false, do not track or render selection guides (e.g. Bible ink mode). */
  enabled?: boolean;
};

export function SelectionPencilOverlay({ enabled = true }: Props) {
  const [rects, setRects] = useState<DOMRect[]>([]);

  useEffect(() => {
    if (!enabled) {
      setRects([]);
      return;
    }
    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setRects([]);
        return;
      }
      const range = sel.getRangeAt(0);
      const list = Array.from(range.getClientRects()).filter(
        (r) => r.width > 0 && r.height > 0,
      );
      setRects(list as DOMRect[]);
    };
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    update();
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  if (!enabled || rects.length === 0) return null;

  return (
    <svg
      aria-hidden
      className="fixed inset-0 pointer-events-none z-[45]"
      style={{ width: "100vw", height: "100dvh" }}
    >
      {rects.map((r, i) => {
        // Draw a slightly wavy dashed line — mimics a pencil tracking the
        // baseline before commitment.
        const y = r.bottom - 1.5;
        const x1 = r.left;
        const x2 = r.right;
        return (
          <line
            key={i}
            x1={x1}
            x2={x2}
            y1={y}
            y2={y}
            stroke="hsl(var(--leather, 22 30% 22%))"
            strokeOpacity={0.55}
            strokeWidth={1.4}
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}