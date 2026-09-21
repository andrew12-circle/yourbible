import { useEffect, useState } from "react";
import { readerVisibleFit } from "@/lib/bible/readerVisibleFit";

type PageProblems = Partial<Record<"left" | "right", "oversized" | "unresolved">>;

/** Re-paginate ordinary overflow. Word-level page cuts also allow a long verse to span physical pages. */
export function useReaderOverflowRecovery(
  layoutKey: string,
  requestCorrection?: (overflowPx: number) => void,
  canCorrect = false,
): PageProblems {
  const [snapshot, setSnapshot] = useState<{ key: string; problems: PageProblems }>({ key: "", problems: {} });
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-bible-reader]");
    if (!root) return;
    let frame: number | null = null;
    let stopped = false;
    let correctionRequested = false;
    const observed = new Set<HTMLElement>();
    const check = () => {
      frame = null;
      if (stopped) return;
      const problems: PageProblems = {};
      const articles = root.querySelectorAll<HTMLElement>("[data-reader-page-side] article[data-reading-area]");
      let maximumOverflow = 0;
      for (const article of articles) {
        // Remove stale flags from an old mounted page; never force columns:1 or overflow:auto.
        article.removeAttribute("data-reader-overflow");
        if (article.closest("[data-bible-scroll]") || article.parentElement?.closest("[inert]")) continue;
        if (!observed.has(article)) { resize?.observe(article); observed.add(article); }
        if (article.querySelector("[data-reader-plate]")) continue;
        const result = readerVisibleFit(article);
        if (result.fits) continue;
        const side = article.closest<HTMLElement>("[data-reader-page-side]")?.dataset.readerPageSide;
        if (side !== "left" && side !== "right") continue;
        const verseCount = article.querySelectorAll("[data-verse-id]").length;
        if (canCorrect && requestCorrection) maximumOverflow = Math.max(maximumOverflow, result.overflowPx);
        else problems[side] = verseCount <= 1 ? "oversized" : "unresolved";
      }
      for (const article of observed) {
        if (!article.isConnected) { resize?.unobserve(article); observed.delete(article); }
      }
      if (maximumOverflow > 0 && !correctionRequested) {
        correctionRequested = true;
        requestCorrection?.(maximumOverflow);
      }
      setSnapshot((old) => old.key === layoutKey && old.problems.left === problems.left && old.problems.right === problems.right
        ? old : { key: layoutKey, problems });
    };
    const schedule = () => { if (frame == null && !stopped) frame = requestAnimationFrame(check); };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resize?.observe(root);
    void document.fonts?.ready.then(schedule);
    document.fonts?.addEventListener("loadingdone", schedule);
    schedule();
    return () => {
      stopped = true;
      observer.disconnect();
      resize?.disconnect();
      document.fonts?.removeEventListener("loadingdone", schedule);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [layoutKey, requestCorrection, canCorrect]);
  return snapshot.key === layoutKey ? snapshot.problems : {};
}
