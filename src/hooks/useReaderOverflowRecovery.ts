import { useEffect } from "react";

/** A single oversized verse/footnote must stay accessible, never hidden under overflow. */
export function useReaderOverflowRecovery(layoutKey: string) {
  useEffect(() => {
    let frame: number | null = null;
    let stopped = false;
    const root = document.querySelector<HTMLElement>("[data-bible-reader]");
    if (!root) return;
    const clipped = (element: HTMLElement) => element.clientHeight > 0 && (element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2);
    const check = () => {
      frame = null;
      if (stopped) return;
      for (const article of root.querySelectorAll<HTMLElement>("[data-reader-page-side] article[data-reading-area]")) {
        if (article.closest("[data-bible-scroll]") || article.hasAttribute("data-reader-overflow")) continue;
        const candidates = [article, ...article.querySelectorAll<HTMLElement>('[class*="scripture-columns"], .scripture-page-stack, .scripture-page-stack > div, .holman-study-stack, .holman-study-stack > div')];
        if (candidates.some(clipped)) article.setAttribute("data-reader-overflow", "");
      }
    };
    const schedule = () => { if (frame == null && !stopped) frame = requestAnimationFrame(check); };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resize?.observe(root);
    void document.fonts?.ready.then(schedule);
    schedule();
    return () => { stopped = true; observer.disconnect(); resize?.disconnect(); if (frame != null) cancelAnimationFrame(frame); };
  }, [layoutKey]);
}
