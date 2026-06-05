import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import ArtifactChannelAvatar from "@/components/framework/artifact-detail/ArtifactChannelAvatar";

export type ArtifactMobileVideoMetaProps = {
  displayTitle: string;
  channel?: string | null;
  channelUrl?: string | null;
  channelThumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  /** Shown when `channel` is missing (e.g. "YouTube"). */
  providerName?: string | null;
  /** In-page back (framework header hidden on mobile YouTube). */
  backTo?: string;
};

export default function ArtifactMobileVideoMeta({
  displayTitle,
  channel,
  channelUrl,
  channelThumbnailUrl,
  youTubeVideoId: _youTubeVideoId,
  providerName,
  backTo = "/framework/artifacts",
}: ArtifactMobileVideoMetaProps) {
  const channelLabel = channel?.trim() || providerName?.trim() || "YouTube";

  return (
    <div className="bg-card px-3 py-3 lg:hidden">
      <Link
        to={backTo}
        className="mb-2.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        aria-label="Back to artifacts"
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Artifacts
      </Link>
      <h1 className="font-display text-base font-normal leading-snug text-foreground line-clamp-3">
        {displayTitle}
      </h1>
      <div className="mt-2.5 flex min-w-0 items-center gap-2.5">
        <ArtifactChannelAvatar
          channel={channelLabel}
          channelThumbnailUrl={channelThumbnailUrl}
          className="h-9 w-9"
        />
        {channelUrl ? (
          <a
            href={channelUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 max-w-full items-center gap-1 text-sm font-medium text-foreground hover:underline"
          >
            <span className="truncate">{channelLabel}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </a>
        ) : (
          <span className="truncate text-sm font-medium text-foreground">{channelLabel}</span>
        )}
      </div>
    </div>
  );
}
