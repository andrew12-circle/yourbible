import { memo } from "react";
import ArtifactYoutubePipOverlay from "@/components/framework/ArtifactYoutubePipOverlay";
import ArtifactCapturePanel from "@/components/framework/artifact-detail/ArtifactCapturePanel";
import ArtifactVideoStage from "@/components/framework/artifact-detail/ArtifactVideoStage";
import type { useArtifactVideoPlayback } from "@/hooks/useArtifactVideoPlayback";
import type { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import type { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import type { ArtifactMoment } from "@/hooks/useArtifactDetailData";

type Pip = ReturnType<typeof useArtifactYoutubePip>;
type Player = ReturnType<typeof useYouTubeEmbedPlayer>;
type Playback = Pick<ReturnType<typeof useArtifactVideoPlayback>, "seekVideoToSeconds">;

type Props = {
  youTubeVideoId: string;
  thumbnailUrl?: string | null;
  youtubePip: Pip;
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
};

function ArtifactYoutubeVideoBlock({
  youTubeVideoId,
  thumbnailUrl,
  youtubePip,
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
}: Props) {
  return (
    <>
      <ArtifactVideoStage
        videoSlotRef={youtubePip.videoSlotRef}
        pipMode={youtubePip.pipMode}
        pipLayout={youtubePip.pipOverlayLayout}
        thumbnailUrl={thumbnailUrl}
        youTubeVideoId={youTubeVideoId}
        playerMountRef={youtubePlayer.mountRef}
        playerReady={youtubePlayer.playerReady}
        playerLoading={youtubePlayer.playerLoading}
        playerInitTimedOut={youtubePlayer.playerInitTimedOut}
        isPlaying={youtubePlayer.isPlaying}
        onTogglePlay={youtubePlayer.togglePlayback}
        onReinitPlayer={youtubePlayer.reinit}
        onScrollVideoIntoView={youtubePip.scrollVideoIntoView}
      >
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
        />
      </ArtifactVideoStage>
      <ArtifactYoutubePipOverlay
        active={youtubePip.pipMode}
        layout={youtubePip.pipOverlayLayout}
        isPlaying={youtubePlayer.isPlaying}
        onTogglePlay={youtubePlayer.togglePlayback}
        onScrollVideoIntoView={youtubePip.scrollVideoIntoView}
        onDragHeaderPointerDown={youtubePip.onPipDragHeaderPointerDown}
        onDragHeaderPointerMove={youtubePip.onPipDragHeaderPointerMove}
        onDragHeaderPointerUp={youtubePip.onPipDragHeaderPointerUp}
        onResizePointerDown={youtubePip.onPipResizePointerDown}
        onResizePointerMove={youtubePip.onPipResizePointerMove}
        onResizePointerUp={youtubePip.onPipResizePointerUp}
      />
    </>
  );
}

export default memo(ArtifactYoutubeVideoBlock);
