import ArtifactEmbeddedJournal from "@/components/framework/artifact-detail/ArtifactEmbeddedJournal";

type JournalPanelProps = {
  userId: string;
  artifactId: string;
  artifactTitle: string;
  artifactKind: string;
  getPlaybackSeconds: (() => number | undefined) | undefined;
  artifactJournalExpanded: boolean;
  onExpand: () => void;
  onDock: () => void;
  onClose: () => void;
};

function sharedJournalProps(props: JournalPanelProps) {
  return {
    userId: props.userId,
    artifactId: props.artifactId,
    artifactTitle: props.artifactTitle,
    artifactKind: props.artifactKind,
    getPlaybackSeconds: props.getPlaybackSeconds,
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
