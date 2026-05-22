import { useLayoutEffect, useRef, type ReactNode } from "react";
import ArtifactMobileVideoMeta from "@/components/framework/artifact-detail/ArtifactMobileVideoMeta";
import ArtifactQuickCaptureRow from "@/components/framework/artifact-detail/ArtifactQuickCaptureRow";
import { cn } from "@/lib/utils";

type Props = {
  displayTitle: string;
  channel?: string | null;
  channelUrl?: string | null;
  providerName?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId: string;
  backTo?: string;
  canCaptureMoments: boolean;
  savingMoment: boolean;
  hasNote: boolean;
  transcriptTabActive: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onOpenNote: () => void;
  onOpenStudyMenu: () => void;
  mobileTabBar?: ReactNode;
  /** Full claim review opened from Key insights (sits below tabs, above scroll). */
  insightExplorePanel?: ReactNode;
};

/** Title/channel scroll away; quick actions + Study/Transcript tabs stay pinned under the fixed video. */
export default function ArtifactMobilePinnedScrollChrome({
  displayTitle,
  channel,
  channelUrl,
  providerName,
  thumbnailUrl,
  youTubeVideoId,
  backTo = "/framework/artifacts",
  canCaptureMoments,
  savingMoment,
  hasNote,
  transcriptTabActive,
  onBookmark,
  onSaveNote,
  onOpenNote,
  onOpenStudyMenu,
  mobileTabBar,
  insightExplorePanel,
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
  }, [transcriptTabActive, mobileTabBar, insightExplorePanel]);

  return (
    <div className="shrink-0 lg:hidden">
      <ArtifactMobileVideoMeta
        displayTitle={displayTitle}
        channel={channel}
        channelUrl={channelUrl}
        providerName={providerName}
        thumbnailUrl={thumbnailUrl}
        youTubeVideoId={youTubeVideoId}
        backTo={backTo}
      />
      <div
        ref={stickyChromeRef}
        className={cn(
          "fixed inset-x-0 z-[38] bg-background shadow-sm supports-[backdrop-filter]:bg-background/95",
          "top-[var(--artifact-mobile-video-h,56.25vw)]",
        )}
      >
        <ArtifactQuickCaptureRow
          canCapture={canCaptureMoments}
          saving={savingMoment}
          hasNote={hasNote}
          transcriptTabActive={transcriptTabActive}
          iconOnly
          onBookmark={onBookmark}
          onSaveNote={onSaveNote}
          onOpenNote={onOpenNote}
          onOpenStudyMenu={onOpenStudyMenu}
        />
        {mobileTabBar}
        {insightExplorePanel}
      </div>
    </div>
  );
}
