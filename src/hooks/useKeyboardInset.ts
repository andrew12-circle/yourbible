import { useEffect, useState } from "react";

/**
 * Returns the height (px) currently occluded by the on-screen keyboard.
 * Uses visualViewport so the value updates as the keyboard opens/closes.
 * Returns 0 on desktop or when no keyboard is visible.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      // Difference between layout viewport and visual viewport == keyboard.
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setInset(diff > 40 ? diff : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}

/**
 * iOS Safari tries to scroll the whole page when a bottom composer gets focus.
 * Lock the document while the composer is focused so only the fixed composer
 * follows the visual viewport / keyboard inset.
 */
export function useLockBodyScrollWhenKeyboardActive(active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const rootStyle = document.documentElement.style;
    const prev = {
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyWidth: bodyStyle.width,
      bodyOverflow: bodyStyle.overflow,
      rootOverflow: rootStyle.overflow,
      rootOverscroll: rootStyle.overscrollBehavior,
    };

    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";
    rootStyle.overflow = "hidden";
    rootStyle.overscrollBehavior = "none";

    const keepPageAnchored = () => window.scrollTo(0, scrollY);
    window.visualViewport?.addEventListener("resize", keepPageAnchored);
    window.visualViewport?.addEventListener("scroll", keepPageAnchored);
    window.addEventListener("scroll", keepPageAnchored, { passive: true });

    return () => {
      window.visualViewport?.removeEventListener("resize", keepPageAnchored);
      window.visualViewport?.removeEventListener("scroll", keepPageAnchored);
      window.removeEventListener("scroll", keepPageAnchored);
      bodyStyle.position = prev.bodyPosition;
      bodyStyle.top = prev.bodyTop;
      bodyStyle.left = prev.bodyLeft;
      bodyStyle.right = prev.bodyRight;
      bodyStyle.width = prev.bodyWidth;
      bodyStyle.overflow = prev.bodyOverflow;
      rootStyle.overflow = prev.rootOverflow;
      rootStyle.overscrollBehavior = prev.rootOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
