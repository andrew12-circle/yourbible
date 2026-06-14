import { type MutableRefObject, type ReactNode } from "react";
import TranscriptPanel from "@/components/framework/TranscriptPanel";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import type { ArtifactMoment } from "@/hooks/useArtifactDetailData";

type SegmentBookmarkActions = {
  onSaveBookmark: (seconds: number, snippet: string) => void;
  onJournal: (seconds: number, snippet: string) => void;
  onResearchLater: (seconds: number, snippet: string) => void;
};

export type ArtifactDetailTranscriptPanelProps = {
  artifactId: string;
  segments: TranscriptSegment[];
  timed: boolean;
  coarseTimestampsOnly: boolean;
  youTubeVideoId: string | null;
  playerReady: boolean;
  isPlaying: boolean;
  togglePlayback: () => void;
  getCurrentPlaybackSeconds: () => number;
  seekVideoToSeconds: (seconds: number, options: { play: boolean }) => void;
  canCaptureMoments: boolean;
  savingMoment: boolean;
  copyTranscript: () => void;
  openJournalFromArtifact: () => void;
  artifactKind: string;
  artifactUrl: string | null;
  retryFetch: (() => void) | undefined;
  inFlight: boolean;
  transcriptRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  transcriptNeedsFormatting: boolean;
  formattingTranscript: boolean;
  formatTranscript: () => void;
  isDesktop: boolean;
  desktopPremiumYoutube: boolean;
  isReadableDocument?: boolean;
  desktopPremiumSplitPane?: boolean;
  setPlaybackRate: (rate: number) => void;
  getIsPlaying: () => boolean;
  pauseVideo: () => void;
  playVideo: () => void;
  bookmarkAtSeconds: (seconds: number, snippet?: string | null) => void;
  journalTranscriptSegment: (seconds: number, snippet: string) => void;
  researchLaterTranscriptSegment: (seconds: number, snippet: string) => void;
  noteBody: string;
  onNoteBodyChange: (value: string) => void;
  artifactPolishKey: string;
  saveSegmentNote: (seconds: number) => void;
  mobileTab: "study" | "transcript" | "notes" | "journal" | "research";
  moments: ArtifactMoment[];
};

export function buildArtifactDetailTranscriptPanel({
  artifactId,
  segments,
  timed,
  coarseTimestampsOnly,
  youTubeVideoId,
  playerReady,
  isPlaying,
  togglePlayback,
  getCurrentPlaybackSeconds,
  seekVideoToSeconds,
  canCaptureMoments,
  savingMoment,
  copyTranscript,
  openJournalFromArtifact,
  artifactKind,
  artifactUrl,
  retryFetch,
  inFlight,
  transcriptRefs,
  transcriptNeedsFormatting,
  formattingTranscript,
  formatTranscript,
  isDesktop,
  desktopPremiumYoutube,
  isReadableDocument = false,
  desktopPremiumSplitPane = false,
  setPlaybackRate,
  getIsPlaying,
  pauseVideo,
  playVideo,
  bookmarkAtSeconds,
  journalTranscriptSegment,
  researchLaterTranscriptSegment,
  noteBody,
  onNoteBodyChange,
  artifactPolishKey,
  saveSegmentNote,
  mobileTab,
  moments,
}: ArtifactDetailTranscriptPanelProps): ReactNode {
  const bookmarkedStartSeconds = moments
    .filter((moment) => moment.kind === "bookmark")
    .map((moment) => moment.start_seconds);

  return (
    <TranscriptPanel
      artifactId={artifactId}
      segments={segments}
      timed={isReadableDocument ? false : timed}
      coarseTimestampsOnly={isReadableDocument ? false : coarseTimestampsOnly}
      embedAvailable={Boolean(youTubeVideoId)}
      playerReady={playerReady}
      isPlaying={isPlaying}
      onTogglePlayback={togglePlayback}
      getPlaybackSeconds={getCurrentPlaybackSeconds}
      onSeek={(seconds) => seekVideoToSeconds(seconds, { play: true })}
      canBookmark={isReadableDocument ? false : canCaptureMoments}
      bookmarking={savingMoment}
      onCopy={copyTranscript}
      onJournal={() => openJournalFromArtifact()}
      fullPageJournalLabel="Full-page journal"
      onRetryFetch={artifactKind === "youtube" && artifactUrl ? retryFetch : undefined}
      retryDisabled={inFlight}
      setSegmentRef={(id, el) => {
        transcriptRefs.current[id] = el;
      }}
      showFormatButton={!isReadableDocument && transcriptNeedsFormatting}
      formattingTranscript={formattingTranscript}
      onFormatTranscript={formatTranscript}
      embeddedInMobileTab={!isDesktop}
      variant={
        desktopPremiumYoutube || (isReadableDocument && desktopPremiumSplitPane)
          ? "desktopStudy"
          : !isDesktop && artifactKind === "youtube"
            ? "youtubeMobile"
            : "default"
      }
      panelTitle={isReadableDocument ? "Book text" : undefined}
      panelSubtitle={
        isReadableDocument
          ? "Plain text extracted from your book — searchable and used for claims analysis."
          : undefined
      }
      setPlaybackRate={setPlaybackRate}
      getIsPlaying={getIsPlaying}
      onPauseVideo={pauseVideo}
      onResumePlayback={playVideo}
      segmentBookmarkActions={
        !isReadableDocument && canCaptureMoments
          ? ({
              onSaveBookmark: (seconds, snippet) => void bookmarkAtSeconds(seconds, snippet),
              onJournal: journalTranscriptSegment,
              onResearchLater: (seconds, snippet) => void researchLaterTranscriptSegment(seconds, snippet),
            } satisfies SegmentBookmarkActions)
          : undefined
      }
      noteBody={noteBody}
      onNoteBodyChange={onNoteBodyChange}
      notePolishResetKey={artifactPolishKey}
      onSaveSegmentNote={saveSegmentNote}
      outerScrollContainerRef={undefined}
      transcriptTabActive={!isDesktop ? mobileTab === "transcript" : true}
      bookmarkedStartSeconds={bookmarkedStartSeconds}
    />
  );
}
