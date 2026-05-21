import { memo, useCallback, useState, type ReactNode } from "react";
import ArtifactYoutubePipOverlay from "@/components/framework/ArtifactYoutubePipOverlay";
import ArtifactCapturePanel from "@/components/framework/artifact-detail/ArtifactCapturePanel";
import ArtifactCollapsibleSection from "@/components/framework/artifact-detail/ArtifactCollapsibleSection";
import ArtifactQuickCaptureRow from "@/components/framework/artifact-detail/ArtifactQuickCaptureRow";
import ArtifactVideoStage from "@/components/framework/artifact-detail/ArtifactVideoStage";
import type { useArtifactVideoPlayback } from "@/hooks/useArtifactVideoPlayback";
import type { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import type { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import type { ArtifactMoment } from "@/hooks/useArtifactDetailData";
import { useIsDesktop } from "@/hooks/use-desktop";

type Pip = ReturnType<typeof useArtifactYoutubePip>;
type Player = ReturnType<typeof useYouTubeEmbedPlayer>;
type Playback = Pick<
  ReturnType<typeof useArtifactVideoPlayback>,
  "seekVideoToSeconds" | "activateAndPlay" | "activatePlayer" | "togglePlayback" | "userActivated"
>;

type Props = {
  youTubeVideoId: string;
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
  stickyFooter?: ReactNode;
};

function ArtifactYoutubeVideoBlock({
  youTubeVideoId,
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
  stickyFooter,
}: Props) {
  const isDesktop = useIsDesktop();
  const captureControlled = stickyMode && !isDesktop;
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
      description="Mark moments at the playhead; add notes when you're ready."
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

  const quickCaptureRow = stickyMode ? (
    <ArtifactQuickCaptureRow
      canCapture={canCaptureMoments}
      saving={savingMoment}
      hasNote={Boolean(noteBody.trim())}
      hasTranscript={hasTranscript}
      onBookmark={onBookmark}
      onSaveNote={onSaveNote}
      onBelieve={onBelieve}
      onStudyJournal={onStudyJournal}
      onOpenJournalTimestamp={onOpenJournalTimestamp}
      onOpenJournalFull={onOpenJournalFull}
      onOpenCapture={openCapture}
    />
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
        quickCaptureRow={quickCaptureRow}
        stickyFooter={stickyFooter}
      >
        {!stickyMode ? captureSection : null}
      </ArtifactVideoStage>
      {stickyMode ? <div className="px-3 pb-1 sm:px-4 lg:px-4 lg:pb-4">{captureSection}</div> : null}
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
