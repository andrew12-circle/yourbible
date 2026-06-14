import { useLayoutEffect, useRef, type ReactNode } from "react";
import ArtifactMobileBookMeta from "@/components/framework/artifact-detail/ArtifactMobileBookMeta";
import {
  createCoalescedLayoutSync,
  readArtifactLayoutPxVar,
  setArtifactLayoutPxVar,
  syncArtifactMobilePinnedHeaderHeight,
} from "@/lib/framework/artifactMobileLayoutSync";
import { cn } from "@/lib/utils";

type Props = {
  displayTitle: string;
  author?: string | null;
  pageCount?: number | null;
  backTo?: string;
  insightExplorePanel?: ReactNode;
  insightExploreOpen?: boolean;
  hideBookMeta?: boolean;
};

/** Title/author scroll away; insight explore fills the pane below the fixed cover. */
export default function ArtifactMobileBookPinnedScrollChrome({
  displayTitle,
  author = null,
  pageCount = null,
  backTo = "/framework/artifacts",
  insightExplorePanel,
  insightExploreOpen = false,
  hideBookMeta = false,
}: Props) {
  const stickyChromeRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const sticky = stickyChromeRef.current;
    const root = sticky?.closest("[data-artifact-youtube-mobile]") as HTMLElement | null;
    if (!sticky || !root) return;
    const sync = () => {
      const stickyH = sticky.getBoundingClientRect().height;
      setArtifactLayoutPxVar(root, "--artifact-mobile-sticky-chrome-h", stickyH);
      const coverH = readArtifactLayoutPxVar(root, "--artifact-mobile-video-h");
      syncArtifactMobilePinnedHeaderHeight(root, coverH, stickyH);
    };
    const scheduleSync = createCoalescedLayoutSync(sync);
    sync();
    const ro = new ResizeObserver(scheduleSync);
    ro.observe(sticky);
    return () => ro.disconnect();
  }, [hideBookMeta, insightExploreOpen, insightExplorePanel]);

  return (
    <div className="shrink-0 lg:hidden">
      {!hideBookMeta ? (
        <ArtifactMobileBookMeta
          displayTitle={displayTitle}
          author={author}
          pageCount={pageCount}
          backTo={backTo}
        />
      ) : null}
      {insightExploreOpen && insightExplorePanel ? (
        <div
          ref={stickyChromeRef}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[38] flex flex-col overflow-hidden bg-background shadow-sm supports-[backdrop-filter]:bg-background/95",
            "top-[var(--artifact-mobile-video-h,56.25vw)]",
          )}
        >
          {insightExplorePanel}
        </div>
      ) : (
        <div ref={stickyChromeRef} className="hidden" />
      )}
    </div>
  );
}
