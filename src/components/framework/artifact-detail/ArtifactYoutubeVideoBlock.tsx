import { memo, useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ArtifactMobilePinnedScrollChrome from "@/components/framework/artifact-detail/ArtifactMobilePinnedScrollChrome";
import ArtifactYoutubePipOverlay from "@/components/framework/ArtifactYoutubePipOverlay";
import ArtifactCapturePanel from "@/components/framework/artifact-detail/ArtifactCapturePanel";
import ArtifactCollapsibleSection from "@/components/framework/artifact-detail/ArtifactCollapsibleSection";
import ArtifactMobileMenu from "@/components/framework/artifact-detail/ArtifactMobileMenu";
import ArtifactVideoStage from "@/components/framework/artifact-detail/ArtifactVideoStage";
import type { ArtifactNavSection } from "@/components/framework/artifact-detail/ArtifactSectionNav";
import type { useArtifactVideoPlayback } from "@/hooks/useArtifactVideoPlayback";
import type { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import type { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import type { ArtifactMoment } from "@/hooks/useArtifactDetailData";
import {
  isArtifactLayoutDesktop,
  isArtifactPipVideo,
  useArtifactLayoutMode,
} from "@/hooks/useArtifactLayoutMode";
import { artifactMobileJournalEdgePad } from "@/lib/framework/artifactLayoutCss";
import { cn } from "@/lib/utils";

type Pip = ReturnType<typeof useArtifactYoutubePip>;
type Player = ReturnType<typeof useYouTubeEmbedPlayer>;
type Playback = Pick<
  ReturnType<typeof useArtifactVideoPlayback>,
  | "seekVideoToSeconds"
  | "activateAndPlay"
  | "activatePlayer"
  | "togglePlayback"
  | "staticEmbedSrc"
  | "onStaticEmbedLoad"
  | "showApiPlayer"
  | "useStaticPip"
  | "isPlaying"
>;

type Props = {
  youTubeVideoId: string;
  displayTitle?: string;
  channel?: string | null;
  channelUrl?: string | null;
  providerName?: string | null;
  thumbnailUrl?: string | null;
  youtubePip: Pip;
  pipEnabled: boolean;
  stickyMode: boolean;
  youtubePlayer: Player;
  playback: Playback;
  artifactId: string;
  moments: ArtifactMoment[];
  bookmarkLabel: string;
  onBookmarkLabelChange: (v: string) => void;
  noteBody: string;
  onNoteBodyChange: (v: string) => void;
  canCaptureMoments: boolean;
  savingMoment: boolean;
  hasTranscript: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onBelieve: () => void;
  onStudyJournal: () => void;
  onOpenJournalTimestamp: () => void;
  onOpenJournalFull: () => void;
  /** Mobile sticky layout: which tab is active (controls capture section visibility). */
  mobileActiveTab?: "study" | "transcript" | "notes" | "journal";
  mobileMenuOpen?: boolean;
  onMobileMenuOpenChange?: (open: boolean) => void;
  menuSections?: ArtifactNavSection[];
  menuActiveHash?: string;
  menuShowPaste?: boolean;
  menuShowWrapUp?: boolean;
  menuShowReanalyze?: boolean;
  onMenuNavigateSection?: (hash: string) => void;
  onMenuOpenTranscript?: () => void;
  onMenuPaste?: () => void;
  onMenuWrapUp?: () => void;
  onMenuReanalyze?: () => void;
  /** Mobile scroll chrome back link (framework header hidden on YouTube). */
  backTo?: string;
  /** Host element inside the scroll pane (title scrolls away; toolbar sticks under video). */
  mobileChromeHost?: HTMLElement | null;
  /** Pinned mobile: switch to Notes tab instead of scrolling to capture. */
  onOpenNotesTab?: () => void;
  /** Key insights tap-to-explore panel (below tabs). */
  insightExplorePanel?: ReactNode;
  insightExploreOpen?: boolean;
  /** Desktop premium: player fills the cinematic hero (not a separate card). */
  heroEmbed?: boolean;
  /** PiP restore (e.g. dock expanded journal after maximize on overlay). */
  onScrollVideoIntoView?: () => void;
};

function ArtifactYoutubeVideoBlock({
  youTubeVideoId,
  displayTitle,
  channel,
  channelUrl,
  providerName,
  thumbnailUrl,
  youtubePip,
  pipEnabled,
  stickyMode,
  youtubePlayer,
  playback,
  artifactId,
  moments,
  bookmarkLabel,
  onBookmarkLabelChange,
  noteBody,
  onNoteBodyChange,
  canCaptureMoments,
  savingMoment,
  hasTranscript,
  onBookmark,
  onSaveNote,
  onBelieve,
  onStudyJournal,
  onOpenJournalTimestamp,
  onOpenJournalFull,
  mobileActiveTab = "study",
  mobileMenuOpen = false,
  onMobileMenuOpenChange,
  menuSections = [],
  menuActiveHash = "",
  menuShowPaste = false,
  menuShowWrapUp = false,
  menuShowReanalyze = false,
  onMenuNavigateSection,
  onMenuOpenTranscript,
  onMenuPaste,
  onMenuWrapUp,
  onMenuReanalyze,
  backTo = "/framework/artifacts",
  mobileChromeHost = null,
  onOpenNotesTab,
  insightExplorePanel,
  insightExploreOpen = false,
  heroEmbed = false,
  onScrollVideoIntoView,
}: Props) {
  const restoreVideo = onScrollVideoIntoView ?? youtubePip.scrollVideoIntoView;
  const layoutMode = useArtifactLayoutMode();
  const isDesktop = isArtifactLayoutDesktop(layoutMode);
  const usesPipVideo = isArtifactPipVideo(layoutMode, true);
  const mobileVideoOnlyRef = useRef<HTMLDivElement | null>(null);
  const mobilePinnedLayout = stickyMode && !usesPipVideo;

  useLayoutEffect(() => {
    if (!mobilePinnedLayout) return;
    const video = mobileVideoOnlyRef.current;
    const root = video?.closest("[data-artifact-youtube-mobile]") as HTMLElement | null;
    if (!video || !root) return;
    const sync = () => {
      const videoH = video.getBoundingClientRect().height;
      root.style.setProperty("--artifact-mobile-video-h", `${Math.max(0, Math.ceil(videoH))}px`);
      const stickyChromeH = parseFloat(
        getComputedStyle(root).getPropertyValue("--artifact-mobile-sticky-chrome-h"),
      );
      const chromeH = Number.isFinite(stickyChromeH) && stickyChromeH > 0 ? stickyChromeH : 0;
      root.style.setProperty(
        "--artifact-mobile-pinned-header-h",
        `${Math.max(0, Math.ceil(videoH + chromeH))}px`,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(video);
    return () => ro.disconnect();
  }, [mobilePinnedLayout]);
  /** Study list already has Capture collapsible; skip duplicate bar under fixed header. */
  const showMobileCaptureSection =
    stickyMode && !usesPipVideo && mobileActiveTab === "study" && !mobilePinnedLayout;
  const captureControlled = showMobileCaptureSection;
  const [captureOpen, setCaptureOpen] = useState(false);
  const [noteSectionOpen, setNoteSectionOpen] = useState(false);

  const openCapture = useCallback(() => {
    setCaptureOpen(true);
    setNoteSectionOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("capture")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const capturePanel = (
    <ArtifactCapturePanel
      bookmarkLabel={bookmarkLabel}
      onBookmarkLabelChange={onBookmarkLabelChange}
      noteBody={noteBody}
      onNoteBodyChange={onNoteBodyChange}
      polishResetKey={artifactId}
      moments={moments}
      canCapture={canCaptureMoments}
      saving={savingMoment}
      onBookmark={onBookmark}
      onSaveNote={onSaveNote}
      onBelieve={onBelieve}
      onStudyJournal={onStudyJournal}
      onOpenJournalTimestamp={onOpenJournalTimestamp}
      onOpenJournalFull={onOpenJournalFull}
      onSeekMoment={playback.seekVideoToSeconds}
      hasTranscript={hasTranscript}
      noteSectionOpen={noteSectionOpen}
      onNoteSectionOpenChange={setNoteSectionOpen}
    />
  );

  const captureSection = (
    <ArtifactCollapsibleSection
      id="capture"
      title="Capture while watching"
      description={
        isDesktop
          ? "Mark moments at the playhead; add notes when you're ready."
          : "Bookmark the playhead or add a note."
      }
      defaultOpenMobile={false}
      defaultOpenDesktop
      storageKey={`artifact-capture:${artifactId}`}
      className="mt-0"
      open={captureControlled ? captureOpen : undefined}
      onOpenChange={captureControlled ? setCaptureOpen : undefined}
    >
      {capturePanel}
    </ArtifactCollapsibleSection>
  );

  const mobileScrollChrome =
    mobilePinnedLayout && mobileChromeHost ? (
      <ArtifactMobilePinnedScrollChrome
        displayTitle={displayTitle?.trim() || "Untitled video"}
        channel={channel}
        channelUrl={channelUrl}
        providerName={providerName}
        thumbnailUrl={thumbnailUrl}
        youTubeVideoId={youTubeVideoId}
        backTo={backTo}
        insightExplorePanel={insightExplorePanel}
        insightExploreOpen={insightExploreOpen}
        hideVideoMeta={mobileActiveTab === "journal"}
      />
    ) : null;

  return (
    <>
      <div
        ref={mobileVideoOnlyRef}
        className={cn(
          mobilePinnedLayout &&
            cn(
              "fixed top-0 left-0 right-0 z-[39] w-full max-w-[100vw] bg-background",
              "pt-[env(safe-area-inset-top,0px)]",
              artifactMobileJournalEdgePad,
              "pb-2",
            ),
          !mobilePinnedLayout && "lg:contents",
        )}
      >
        <ArtifactVideoStage
          videoSlotRef={youtubePip.videoSlotRef}
          pipMode={youtubePip.pipMode}
          useStaticPip={playback.useStaticPip}
          stickyMode={stickyMode}
          mobilePinnedHeader={mobilePinnedLayout}
          variant={heroEmbed ? "hero" : "default"}
          pipLayout={youtubePip.pipOverlayLayout}
          thumbnailUrl={thumbnailUrl}
          youTubeVideoId={youTubeVideoId}
          staticEmbedSrc={playback.staticEmbedSrc}
          onStaticEmbedLoad={playback.onStaticEmbedLoad}
          showApiPlayer={playback.showApiPlayer}
          playerMountRef={youtubePlayer.mountRef}
          playerReady={youtubePlayer.playerReady}
          playerInitTimedOut={youtubePlayer.playerInitTimedOut}
          isPlaying={playback.isPlaying}
          playerActivated={Boolean(youTubeVideoId)}
          onTogglePlay={playback.togglePlayback}
          onReinitPlayer={() => {
            playback.activatePlayer({ autoplay: false });
            youtubePlayer.reinit();
          }}
          onScrollVideoIntoView={restoreVideo}
        >
          {!stickyMode ? captureSection : null}
        </ArtifactVideoStage>
      </div>
      {mobileScrollChrome && mobileChromeHost
        ? createPortal(mobileScrollChrome, mobileChromeHost)
        : null}
      {stickyMode && !usesPipVideo && onMobileMenuOpenChange ? (
        <ArtifactMobileMenu
          open={mobileMenuOpen}
          onOpenChange={onMobileMenuOpenChange}
          showTrigger={false}
          sections={menuSections}
          activeHash={menuActiveHash}
          showPaste={menuShowPaste}
          showWrapUp={menuShowWrapUp}
          showReanalyze={menuShowReanalyze}
          hasTranscript={hasTranscript}
          onNavigateSection={onMenuNavigateSection ?? (() => {})}
          onOpenTranscript={onMenuOpenTranscript ?? (() => {})}
          onPaste={onMenuPaste ?? (() => {})}
          onWrapUp={onMenuWrapUp ?? (() => {})}
          onReanalyze={onMenuReanalyze ?? (() => {})}
          canCapture={canCaptureMoments}
          captureSaving={savingMoment}
          onBookmark={onBookmark}
          onBelieve={onBelieve}
          onStudyJournal={onStudyJournal}
          onOpenJournalTimestamp={onOpenJournalTimestamp}
          onOpenJournalFull={onOpenJournalFull}
        />
      ) : null}
      {showMobileCaptureSection ? (
        <div className="border-b border-border/50 px-3 sm:px-4">{captureSection}</div>
      ) : null}
      {pipEnabled ? (
        <ArtifactYoutubePipOverlay
          active={youtubePip.pipMode}
          layout={youtubePip.pipOverlayLayout}
          isPlaying={playback.isPlaying}
          onTogglePlay={playback.togglePlayback}
          onScrollVideoIntoView={restoreVideo}
          onDragHeaderPointerDown={youtubePip.onPipDragHeaderPointerDown}
          onDragHeaderPointerMove={youtubePip.onPipDragHeaderPointerMove}
          onDragHeaderPointerUp={youtubePip.onPipDragHeaderPointerUp}
          onResizePointerDown={youtubePip.onPipResizePointerDown}
          onResizePointerMove={youtubePip.onPipResizePointerMove}
          onResizePointerUp={youtubePip.onPipResizePointerUp}
        />
      ) : null}
    </>
  );
}

export default memo(ArtifactYoutubeVideoBlock);
