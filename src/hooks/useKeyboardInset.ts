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
