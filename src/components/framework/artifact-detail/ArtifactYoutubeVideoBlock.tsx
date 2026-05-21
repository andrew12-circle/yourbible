import { memo, useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import ArtifactYoutubePipOverlay from "@/components/framework/ArtifactYoutubePipOverlay";
import ArtifactCapturePanel from "@/components/framework/artifact-detail/ArtifactCapturePanel";
import ArtifactCollapsibleSection from "@/components/framework/artifact-detail/ArtifactCollapsibleSection";
import ArtifactMobileMenu from "@/components/framework/artifact-detail/ArtifactMobileMenu";
import ArtifactMobileVideoMeta from "@/components/framework/artifact-detail/ArtifactMobileVideoMeta";
import ArtifactQuickCaptureRow from "@/components/framework/artifact-detail/ArtifactQuickCaptureRow";
import ArtifactVideoStage from "@/components/framework/artifact-detail/ArtifactVideoStage";
import type { ArtifactNavSection } from "@/components/framework/artifact-detail/ArtifactSectionNav";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { useArtifactVideoPlayback } from "@/hooks/useArtifactVideoPlayback";
import type { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import type { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import type { ArtifactMoment } from "@/hooks/useArtifactDetailData";
import {
  isArtifactLayoutDesktop,
  isArtifactPipVideo,
  useArtifactLayoutMode,
} from "@/hooks/useArtifactLayoutMode";

type Pip = ReturnType<typeof useArtifactYoutubePip>;
type Player = ReturnType<typeof useYouTubeEmbedPlayer>;
type Playback = Pick<
  ReturnType<typeof useArtifactVideoPlayback>,
  "seekVideoToSeconds" | "activateAndPlay" | "activatePlayer" | "togglePlayback" | "userActivated"
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
  mobileTabBar?: ReactNode;
  /** Mobile sticky layout: which tab is active (controls capture section visibility). */
  mobileActiveTab?: "study" | "transcript";
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
  mobileTabBar,
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
}: Props) {
  const layoutMode = useArtifactLayoutMode();
  const isDesktop = isArtifactLayoutDesktop(layoutMode);
  const usesPipVideo = isArtifactPipVideo(layoutMode, true);
  const mobileChromeRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!stickyMode || usesPipVideo) return;
    const chrome = mobileChromeRef.current;
    const root = chrome?.closest(".min-h-screen") as HTMLElement | null;
    if (!chrome || !root) return;
    const sync = () => {
      const h = chrome.getBoundingClientRect().height;
      root.style.setProperty("--artifact-sticky-chrome-h", `${Math.max(0, Math.ceil(h))}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(chrome);
    return () => ro.disconnect();
  }, [stickyMode, usesPipVideo]);
  const transcriptTabActive = stickyMode && !usesPipVideo && mobileActiveTab === "transcript";
  const showMobileCaptureSection = stickyMode && !usesPipVideo && mobileActiveTab === "study";
  const captureControlled = showMobileCaptureSection;
  const [captureOpen, setCaptureOpen] = useState(false);
  const [noteSectionOpen, setNoteSectionOpen] = useState(false);
  const [mobileNoteOpen, setMobileNoteOpen] = useState(false);

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

  const mobileVideoMeta =
    stickyMode && !usesPipVideo ? (
      <div className="md:hidden">
      <ArtifactMobileVideoMeta
        displayTitle={displayTitle?.trim() || "Untitled video"}
        channel={channel}
        channelUrl={channelUrl}
        providerName={providerName}
        thumbnailUrl={thumbnailUrl}
        youTubeVideoId={youTubeVideoId}
        backTo={backTo}
      />
      </div>
    ) : null;

  const openStudyMenu = useCallback(() => {
    onMobileMenuOpenChange?.(true);
  }, [onMobileMenuOpenChange]);

  const scrollableMobileChrome =
    stickyMode && !usesPipVideo ? (
      <div ref={mobileChromeRef} className="border-b border-border/50 bg-background lg:hidden">
        {mobileVideoMeta}
        <ArtifactQuickCaptureRow
          canCapture={canCaptureMoments}
          saving={savingMoment}
          hasNote={Boolean(noteBody.trim())}
          transcriptTabActive={transcriptTabActive}
          iconOnly
          onBookmark={onBookmark}
          onSaveNote={onSaveNote}
          onOpenNote={() => {
            if (transcriptTabActive) setMobileNoteOpen(true);
            else openCapture();
          }}
          onOpenStudyMenu={openStudyMenu}
        />
        {mobileTabBar}
      </div>
    ) : null;

  return (
    <>
      <ArtifactVideoStage
        videoSlotRef={youtubePip.videoSlotRef}
        pipMode={youtubePip.pipMode}
        stickyMode={stickyMode}
        pipLayout={youtubePip.pipOverlayLayout}
        thumbnailUrl={thumbnailUrl}
        youTubeVideoId={youTubeVideoId}
        playerMountRef={youtubePlayer.mountRef}
        playerReady={youtubePlayer.playerReady}
        playerLoading={youtubePlayer.playerLoading}
        playerInitTimedOut={youtubePlayer.playerInitTimedOut}
        isPlaying={youtubePlayer.isPlaying}
        playerActivated={playback.userActivated}
        onActivateAndPlay={playback.activateAndPlay}
        onTogglePlay={playback.togglePlayback}
        onReinitPlayer={() => {
          playback.activatePlayer({ autoplay: false });
          youtubePlayer.reinit();
        }}
        onScrollVideoIntoView={youtubePip.scrollVideoIntoView}
      >
        {!stickyMode ? captureSection : null}
      </ArtifactVideoStage>
      {scrollableMobileChrome}
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
          onBelieve={onBelieve}
          onStudyJournal={onStudyJournal}
          onOpenJournalTimestamp={onOpenJournalTimestamp}
          onOpenJournalFull={onOpenJournalFull}
        />
      ) : null}
      {showMobileCaptureSection ? (
        <div className="border-b border-border/50 px-3 sm:px-4">{captureSection}</div>
      ) : null}
      {transcriptTabActive ? (
        <Dialog open={mobileNoteOpen} onOpenChange={setMobileNoteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Note at playhead</DialogTitle>
              <DialogDescription>
                Saves a timestamped note for this video. Use the bookmark on a transcript line to capture an exact quote.
              </DialogDescription>
            </DialogHeader>
            <PolishedTextarea
              polishResetKey={artifactId}
              value={noteBody}
              onChange={(e) => onNoteBodyChange(e.target.value)}
              rows={4}
              placeholder="Add a note at the current moment…"
              disabled={!canCaptureMoments || savingMoment}
              className="w-full min-w-0"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMobileNoteOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void onSaveNote().then(() => setMobileNoteOpen(false))}
                disabled={!canCaptureMoments || savingMoment || !noteBody.trim()}
              >
                {savingMoment ? "Saving…" : "Save note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      {pipEnabled ? (
        <ArtifactYoutubePipOverlay
          active={youtubePip.pipMode}
          layout={youtubePip.pipOverlayLayout}
          isPlaying={youtubePlayer.isPlaying}
          onTogglePlay={playback.togglePlayback}
          onScrollVideoIntoView={youtubePip.scrollVideoIntoView}
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
