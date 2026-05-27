import ArtifactDetailHeader from "@/components/framework/artifact-detail/ArtifactDetailHeader";

type Props = {
  displayTitle: string;
  statusLabel: string;
  inFlight: boolean;
  channel?: string | null;
  channelUrl?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId: string | null;
  onScrollToVideo: () => void;
};

export default function ArtifactDetailYoutubeHeaderLeading({
  displayTitle,
  statusLabel,
  inFlight,
  channel,
  channelUrl,
  thumbnailUrl,
  youTubeVideoId,
  onScrollToVideo,
}: Props) {
  return (
    <ArtifactDetailHeader
      displayTitle={displayTitle}
      statusLabel={statusLabel}
      inFlight={inFlight}
      channel={channel}
      channelUrl={channelUrl}
      thumbnailUrl={thumbnailUrl}
      youTubeVideoId={youTubeVideoId}
      onScrollToVideo={onScrollToVideo}
    />
  );
}
