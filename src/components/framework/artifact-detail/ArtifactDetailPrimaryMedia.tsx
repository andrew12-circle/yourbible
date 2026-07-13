import type { ReactNode, RefObject } from "react";
import ArtifactDetailDesktopShell from "@/components/framework/artifact-detail/ArtifactDetailDesktopShell";
import ArtifactDocumentDetailBlock, {
  type ArtifactDocumentDetailBlockHandle,
} from "@/components/framework/artifact-detail/ArtifactDocumentDetailBlock";
import ArtifactYoutubeVideoBlock from "@/components/framework/artifact-detail/ArtifactYoutubeVideoBlock";
import type { ArtifactNavSection } from "@/components/framework/artifact-detail/ArtifactSectionNav";
import type { ArtifactMobileTab } from "@/hooks/useArtifactDetailMobileTabs";
import type { useArtifactVideoPlayback } from "@/hooks/useArtifactVideoPlayback";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { artifactDesktopVideoCard } from "@/lib/framework/artifactSurfaces";
import type { ArtifactMetadata, ArtifactMoment } from "@/lib/framework/artifactDetailTypes";
import { formatArtifactStatus } from "@/lib/framework/artifactDetailPageHelpers";

type DocumentBlockProps = React.ComponentPropsWithoutRef<typeof ArtifactDocumentDetailBlock>;
type VideoPlayback = ReturnType<typeof useArtifactVideoPlayback>;

type Props = {
  artifact: ArtifactRow;
  artifactMetadata: ArtifactMetadata;
  mergedVideoMeta: ArtifactMetadata;
  displayTitle: string;
  youTubeVideoId: string | null;
  desktopPremiumYoutube: boolean;
  desktopPremiumDocument: boolean;
  stickyVideoMode: boolean;
  mobilePinnedPane: boolean;
  isReadableDocument: boolean;
  isDesktop: boolean;
  inFlight: boolean;
  artifactJournalExpanded: boolean;
  documentDetailBlockProps: DocumentBlockProps | null;
  documentBlockRef: RefObject<ArtifactDocumentDetailBlockHandle | null>;
  videoPlayback: VideoPlayback;
  pipEnabled: boolean;
  moments: ArtifactMoment[];
  bookmarkLabel: string;
  noteBody: string;
  canCaptureMoments: boolean;
  savingMoment: boolean;
  mobileTab: ArtifactMobileTab;
  mobileMenuOpen: boolean;
  navSections: ArtifactNavSection[];
  pageSectionHash: string;
  artifactJournalOpen: boolean;
  mobileChromeHost: HTMLDivElement | null;
  mobileInsightExplorePanel: ReactNode;
  mobileInsightExploreOpen: boolean;
  onTogglePlayback: () => void;
  onNavigateHash: (hash: string) => void;
  onPasteTranscript: () => void;
  onWrapUp: () => void;
  onReanalyze: () => void;
  onRetryFetch: () => void;
  onOpenTranscriptTab: () => void;
  onOpenStudyTab: () => void;
  onOpenJournalTab: () => void;
  onGoHome: () => void;
  onOpenNotesTab: () => void;
  onRestoreFromPip: () => void;
  onBookmark: () => void;
  onSaveNote: () => void;
  onBelieve: () => void;
  onStudyJournal: () => void;
  onOpenJournalFromArtifact: (startSeconds?: number) => void;
  getCurrentPlaybackSeconds: () => number;
  onBookmarkLabelChange: (value: string) => void;
  onNoteBodyChange: (value: string) => void;
  onMobileMenuOpenChange: (open: boolean) => void;
};

export default function ArtifactDetailPrimaryMedia({
  artifact,
  artifactMetadata,
  mergedVideoMeta,
  displayTitle,
  youTubeVideoId,
  desktopPremiumYoutube,
  desktopPremiumDocument,
  stickyVideoMode,
  mobilePinnedPane,
  isReadableDocument,
  isDesktop,
  inFlight,
  artifactJournalExpanded,
  documentDetailBlockProps,
  documentBlockRef,
  videoPlayback,
  pipEnabled,
  moments,
  bookmarkLabel,
  noteBody,
  canCaptureMoments,
  savingMoment,
  mobileTab,
  mobileMenuOpen,
  navSections,
  pageSectionHash,
  artifactJournalOpen,
  mobileChromeHost,
  mobileInsightExplorePanel,
  mobileInsightExploreOpen,
  onTogglePlayback,
  onNavigateHash,
  onPasteTranscript,
  onWrapUp,
  onReanalyze,
  onRetryFetch,
  onOpenTranscriptTab,
  onOpenStudyTab,
  onOpenJournalTab,
  onGoHome,
  onOpenNotesTab,
  onRestoreFromPip,
  onBookmark,
  onSaveNote,
  onBelieve,
  onStudyJournal,
  onOpenJournalFromArtifact,
  getCurrentPlaybackSeconds,
  onBookmarkLabelChange,
  onNoteBodyChange,
  onMobileMenuOpenChange,
}: Props) {
  const { youtubePip, youtubePlayer } = videoPlayback;

  return (
    <>
      {desktopPremiumYoutube && youTubeVideoId ? (
        <ArtifactDetailDesktopShell
          videoSlotRef={youtubePip.videoSlotRef}
          hero={{
            displayTitle,
            statusLabel: formatArtifactStatus(artifact.status),
            inFlight,
            channel: mergedVideoMeta.channel_title,
            channelUrl: mergedVideoMeta.channel_url,
            channelThumbnailUrl: mergedVideoMeta.channel_thumbnail_url,
            thumbnailUrl: mergedVideoMeta.thumbnail_url,
            youTubeVideoId,
            durationSeconds: mergedVideoMeta.duration_seconds ?? artifactMetadata.duration_seconds,
            createdAt: artifact.created_at,
            isPlaying: videoPlayback.isPlaying,
            onTogglePlay: () => {
              if (videoPlayback.playerReady) onTogglePlayback();
              else videoPlayback.activateAndPlay();
            },
            onAddNote: () => onNavigateHash("#capture"),
            showPaste: artifact.kind === "youtube",
            showWrapUp: artifact.kind === "youtube" && artifact.status === "ready",
            showReanalyze: !inFlight && artifact.status !== "error",
            onPasteTranscript: onPasteTranscript,
            onWrapUp,
            onReanalyze,
            videoInPip: youtubePip.pipMode || artifactJournalExpanded,
          }}
          videoBlock={
            <ArtifactYoutubeVideoBlock
              youTubeVideoId={youTubeVideoId}
              youtubePip={youtubePip}
              pipEnabled={pipEnabled}
              stickyMode={stickyVideoMode}
              heroEmbed={desktopPremiumYoutube}
              youtubePlayer={youtubePlayer}
              playback={videoPlayback}
              artifactId={artifact.id}
              moments={moments}
              bookmarkLabel={bookmarkLabel}
              onBookmarkLabelChange={onBookmarkLabelChange}
              noteBody={noteBody}
              onNoteBodyChange={onNoteBodyChange}
              canCaptureMoments={canCaptureMoments}
              savingMoment={savingMoment}
              hasTranscript={Boolean(artifact.raw_text?.trim())}
              onBookmark={onBookmark}
              onSaveNote={onSaveNote}
              onBelieve={onBelieve}
              onStudyJournal={onStudyJournal}
              onOpenJournalTimestamp={() => onOpenJournalFromArtifact(getCurrentPlaybackSeconds())}
              onOpenJournalFull={() => onOpenJournalFromArtifact()}
              onScrollVideoIntoView={onRestoreFromPip}
            />
          }
        />
      ) : null}

      {desktopPremiumDocument && documentDetailBlockProps ? (
        <section className={artifactDesktopVideoCard} id="video" aria-label="Book">
          <ArtifactDocumentDetailBlock ref={documentBlockRef} heroEmbed {...documentDetailBlockProps} />
        </section>
      ) : null}

      {youTubeVideoId && !desktopPremiumYoutube ? (
        <ArtifactYoutubeVideoBlock
          youTubeVideoId={youTubeVideoId}
          displayTitle={stickyVideoMode ? displayTitle : undefined}
          channel={stickyVideoMode ? mergedVideoMeta.channel_title : undefined}
          channelUrl={stickyVideoMode ? mergedVideoMeta.channel_url : undefined}
          channelThumbnailUrl={stickyVideoMode ? mergedVideoMeta.channel_thumbnail_url : undefined}
          providerName={stickyVideoMode ? mergedVideoMeta.provider_name : undefined}
          thumbnailUrl={mergedVideoMeta.thumbnail_url}
          youtubePip={youtubePip}
          pipEnabled={pipEnabled}
          stickyMode={stickyVideoMode}
          youtubePlayer={youtubePlayer}
          playback={videoPlayback}
          artifactId={artifact.id}
          moments={moments}
          bookmarkLabel={bookmarkLabel}
          onBookmarkLabelChange={onBookmarkLabelChange}
          noteBody={noteBody}
          onNoteBodyChange={onNoteBodyChange}
          canCaptureMoments={canCaptureMoments}
          savingMoment={savingMoment}
          hasTranscript={Boolean(artifact.raw_text?.trim())}
          onBookmark={onBookmark}
          onSaveNote={onSaveNote}
          onBelieve={onBelieve}
          onStudyJournal={onStudyJournal}
          onOpenJournalTimestamp={() => onOpenJournalFromArtifact(getCurrentPlaybackSeconds())}
          onOpenJournalFull={() => onOpenJournalFromArtifact()}
          mobileActiveTab={mobileTab}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuOpenChange={stickyVideoMode ? onMobileMenuOpenChange : undefined}
          menuSections={navSections}
          menuActiveHash={pageSectionHash}
          menuShowPaste={artifact.kind === "youtube"}
          menuShowRetryFetch={artifact.kind === "youtube" && artifact.status === "error" && Boolean(artifact.url)}
          menuShowWrapUp={artifact.kind === "youtube" && artifact.status === "ready"}
          menuShowReanalyze={!inFlight && artifact.status !== "error"}
          onMenuRetryFetch={onRetryFetch}
          onMenuNavigateSection={onNavigateHash}
          onMenuOpenTranscript={onOpenTranscriptTab}
          onMenuOpenStudy={onOpenStudyTab}
          onMenuOpenJournal={onOpenJournalTab}
          onMenuGoHome={onGoHome}
          menuMobileTab={mobileTab}
          menuJournalActive={artifactJournalOpen}
          menuSecondaryViewLabel="Transcript"
          onOpenNotesTab={onOpenNotesTab}
          insightExplorePanel={mobileInsightExplorePanel}
          insightExploreOpen={mobileInsightExploreOpen}
          onMenuPaste={onPasteTranscript}
          onMenuWrapUp={onWrapUp}
          onMenuReanalyze={onReanalyze}
          backTo="/framework/artifacts"
          mobileChromeHost={mobileChromeHost}
          onScrollVideoIntoView={onRestoreFromPip}
        />
      ) : null}

      {isReadableDocument && !desktopPremiumDocument && documentDetailBlockProps ? (
        <ArtifactDocumentDetailBlock
          ref={documentBlockRef}
          stickyMode={!isDesktop && !mobilePinnedPane}
          mobilePinnedLayout={mobilePinnedPane && isReadableDocument}
          mobileActiveTab={mobileTab}
          mobileChromeHost={mobileChromeHost}
          backTo="/framework/artifacts"
          insightExplorePanel={mobileInsightExplorePanel}
          insightExploreOpen={mobileInsightExploreOpen}
          {...documentDetailBlockProps}
        />
      ) : null}
    </>
  );
}
