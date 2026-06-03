import ArtifactEmbeddedJournal from "@/components/framework/artifact-detail/ArtifactEmbeddedJournal";
import type { ArtifactJournalSourceMetaProps } from "@/components/framework/artifact-detail/ArtifactJournalSourceMeta";
import type { TranscriptSegment } from "@/lib/transcriptSplit";

type JournalPanelProps = {
  userId: string;
  artifactId: string;
  artifactTitle: string;
  artifactKind: string;
  getPlaybackSeconds: (() => number | undefined) | undefined;
  transcriptSegments: TranscriptSegment[];
  onSeekPlayback?: (seconds: number) => void;
  artifactJournalExpanded: boolean;
  onExpand: () => void;
  onDock: () => void;
  onClose: () => void;
} & ArtifactJournalSourceMetaProps;

function sharedJournalProps(props: JournalPanelProps) {
  return {
    userId: props.userId,
    artifactId: props.artifactId,
    artifactTitle: props.artifactTitle,
    artifactKind: props.artifactKind,
    channel: props.channel,
    channelUrl: props.channelUrl,
    author: props.author,
    thumbnailUrl: props.thumbnailUrl,
    youTubeVideoId: props.youTubeVideoId,
    providerName: props.providerName,
    getPlaybackSeconds: props.getPlaybackSeconds,
    transcriptSegments: props.transcriptSegments,
    onSeekPlayback: props.onSeekPlayback,
    viewMode: props.artifactJournalExpanded ? ("expanded" as const) : ("docked" as const),
    onExpand: props.onExpand,
    onDock: props.onDock,
    onClose: props.onClose,
  };
}

export function ArtifactDetailDockedJournalPanel(props: JournalPanelProps) {
  return <ArtifactEmbeddedJournal {...sharedJournalProps(props)} />;
}

export function ArtifactDetailMobileJournalTabPanel(props: JournalPanelProps) {
  return (
    <ArtifactEmbeddedJournal
      {...sharedJournalProps(props)}
      fillUnderVideo
      className="h-full min-h-0 w-full max-w-none"
    />
  );
}
