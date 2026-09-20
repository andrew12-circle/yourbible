import { useEffect } from "react";

/** An unusually tall verse must remain accessible even when it cannot fit a page. */
export function useReaderOverflowRecovery(layoutKey: string) {
  useEffect(() => {
    let frame: number | null = null;
    let stopped = false;
    const root = document.querySelector<HTMLElement>("[data-bible-reader]");
    if (!root) return;
    const check = () => {
      frame = null;
      if (stopped) return;
      for (const article of root.querySelectorAll<HTMLElement>("[data-reader-page-side] article[data-reading-area]")) {
        if (article.closest("[data-bible-scroll]") || article.hasAttribute("data-reader-overflow")) continue;
        const columns = article.querySelector<HTMLElement>('[class*="scripture-columns"]');
        const overflowing = columns ? columns.scrollWidth > columns.clientWidth + 2 || columns.scrollHeight > columns.clientHeight + 2 : article.scrollHeight > article.clientHeight + 2;
        if (overflowing) article.setAttribute("data-reader-overflow", "");
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
