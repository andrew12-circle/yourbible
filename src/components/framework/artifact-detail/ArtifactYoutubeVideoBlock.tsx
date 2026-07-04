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
import {
  createCoalescedLayoutSync,
  measureArtifactMobileVideoBlockHeight,
  readArtifactLayoutPxVar,
  setArtifactLayoutPxVar,
  syncArtifactMobilePinnedHeaderHeight,
} from "@/lib/framework/artifactMobileLayoutSync";
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
  | "documentPip"
  | "handleRestoreFromDocumentPip"
>;

type Props = {
  youTubeVideoId: string;
  displayTitle?: string;
  channel?: string | null;
  channelUrl?: string | null;
  channelThumbnailUrl?: string | null;
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
  menuShowRetryFetch?: boolean;
  menuShowWrapUp?: boolean;
  menuShowReanalyze?: boolean;
  onMenuNavigateSection?: (hash: string) => void;
  onMenuOpenTranscript?: () => void;
  onMenuPaste?: () => void;
  onMenuRetryFetch?: () => void;
  onMenuWrapUp?: () => void;
  onMenuReanalyze?: () => void;
  menuMobileTab?: "study" | "transcript" | "notes" | "journal";
  menuJournalActive?: boolean;
  onMenuOpenStudy?: () => void;
  onMenuOpenJournal?: () => void;
  onMenuGoHome?: () => void;
  menuSecondaryViewLabel?: string;
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
  channelThumbnailUrl,
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
  menuShowRetryFetch = false,
  menuShowWrapUp = false,
  menuShowReanalyze = false,
  onMenuNavigateSection,
  onMenuOpenTranscript,
  onMenuPaste,
  onMenuRetryFetch,
  onMenuWrapUp,
  onMenuReanalyze,
  menuMobileTab = mobileActiveTab,
  menuJournalActive = false,
  onMenuOpenStudy,
  onMenuOpenJournal,
  onMenuGoHome,
  menuSecondaryViewLabel = "Transcript",
  backTo = "/framework/artifacts",
  mobileChromeHost = null,
  onOpenNotesTab,
  insightExplorePanel,
  insightExploreOpen = false,
  heroEmbed = false,
  onScrollVideoIntoView,
}: Props) {
  const restoreVideo = onScrollVideoIntoView ?? youtubePip.scrollVideoIntoView;
  const { documentPip } = playback;
  const handleEnterDocumentPip = useCallback(() => {
    void documentPip.enterDocumentPip();
  }, [documentPip]);
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
      const videoH = measureArtifactMobileVideoBlockHeight(video);
      setArtifactLayoutPxVar(root, "--artifact-mobile-video-h", videoH);
      const stickyChromeH = readArtifactLayoutPxVar(root, "--artifact-mobile-sticky-chrome-h");
      syncArtifactMobilePinnedHeaderHeight(root, videoH, stickyChromeH);
    };
    const scheduleSync = createCoalescedLayoutSync(sync);
    sync();
    const ro = new ResizeObserver(scheduleSync);
    ro.observe(video);
    const onViewportChange = () => scheduleSync();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
    };
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
        channelThumbnailUrl={channelThumbnailUrl}
        providerName={providerName}
        youTubeVideoId={youTubeVideoId}
        backTo={backTo}
        insightExplorePanel={insightExplorePanel}
        insightExploreOpen={insightExploreOpen}
        hideVideoMeta={mobileActiveTab === "journal" || mobileActiveTab === "research"}
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
          documentPipSupported={documentPip.documentPipSupported}
          documentPipActive={documentPip.documentPipActive}
          onEnterDocumentPip={handleEnterDocumentPip}
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
          showRetryFetch={menuShowRetryFetch}
          showWrapUp={menuShowWrapUp}
          showReanalyze={menuShowReanalyze}
          hasTranscript={hasTranscript}
          secondaryViewLabel={menuSecondaryViewLabel}
          mobileTab={menuMobileTab}
          journalActive={menuJournalActive}
          onOpenStudy={onMenuOpenStudy}
          onOpenJournal={onMenuOpenJournal}
          onGoHome={onMenuGoHome}
          onNavigateSection={onMenuNavigateSection ?? (() => {})}
          onOpenTranscript={onMenuOpenTranscript ?? (() => {})}
          onPaste={onMenuPaste ?? (() => {})}
          onRetryFetch={onMenuRetryFetch ?? (() => {})}
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
          documentPipSupported={documentPip.documentPipSupported}
          documentPipActive={documentPip.documentPipActive}
          onEnterDocumentPip={handleEnterDocumentPip}
          onExitDocumentPip={documentPip.exitDocumentPip}
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
