import { useLayoutEffect, useRef, type ReactNode } from "react";
import ArtifactMobileVideoMeta from "@/components/framework/artifact-detail/ArtifactMobileVideoMeta";
import { cn } from "@/lib/utils";

type Props = {
  displayTitle: string;
  channel?: string | null;
  channelUrl?: string | null;
  channelThumbnailUrl?: string | null;
  providerName?: string | null;
  youTubeVideoId: string;
  backTo?: string;
  /** Full claim review opened from Key insights (sits below tabs, above scroll). */
  insightExplorePanel?: ReactNode;
  insightExploreOpen?: boolean;
  /** Journal tab: hide back link, title, and channel under the pinned video. */
  hideVideoMeta?: boolean;
};

/** Title/channel scroll away; quick actions + Study/Transcript tabs stay pinned under the fixed video. */
export default function ArtifactMobilePinnedScrollChrome({
  displayTitle,
  channel,
  channelUrl,
  channelThumbnailUrl,
  providerName,
  youTubeVideoId,
  backTo = "/framework/artifacts",
  insightExplorePanel,
  insightExploreOpen = false,
  hideVideoMeta = false,
}: Props) {
  const stickyChromeRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const sticky = stickyChromeRef.current;
    const root = sticky?.closest("[data-artifact-youtube-mobile]") as HTMLElement | null;
    if (!sticky || !root) return;
    const sync = () => {
      const stickyH = sticky.getBoundingClientRect().height;
      root.style.setProperty("--artifact-mobile-sticky-chrome-h", `${Math.max(0, Math.ceil(stickyH))}px`);
      const videoH = parseFloat(
        getComputedStyle(root).getPropertyValue("--artifact-mobile-video-h"),
      );
      const v = Number.isFinite(videoH) && videoH > 0 ? videoH : 0;
      root.style.setProperty(
        "--artifact-mobile-pinned-header-h",
        `${Math.max(0, Math.ceil(v + stickyH))}px`,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(sticky);
    return () => ro.disconnect();
  }, [hideVideoMeta, insightExploreOpen, insightExplorePanel]);

  return (
    <div className="shrink-0 lg:hidden">
      {!hideVideoMeta ? (
        <ArtifactMobileVideoMeta
          displayTitle={displayTitle}
          channel={channel}
          channelUrl={channelUrl}
          channelThumbnailUrl={channelThumbnailUrl}
          providerName={providerName}
          youTubeVideoId={youTubeVideoId}
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
