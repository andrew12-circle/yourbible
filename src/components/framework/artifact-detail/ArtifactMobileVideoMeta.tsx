import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

export type ArtifactMobileVideoMetaProps = {
  displayTitle: string;
  channel?: string | null;
  channelUrl?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  /** Shown when `channel` is missing (e.g. "YouTube"). */
  providerName?: string | null;
  /** In-page back (framework header hidden on mobile YouTube). */
  backTo?: string;
};

function channelInitial(channel: string): string {
  const trimmed = channel.trim();
  if (!trimmed) return "?";
  const first = trimmed.replace(/^@/, "").charAt(0);
  return first ? first.toUpperCase() : "?";
}

export default function ArtifactMobileVideoMeta({
  displayTitle,
  channel,
  channelUrl,
  thumbnailUrl,
  youTubeVideoId,
  providerName,
  backTo = "/framework/artifacts",
}: ArtifactMobileVideoMetaProps) {
  const channelLabel = channel?.trim() || providerName?.trim() || "YouTube";
  const avatarSrc = thumbnailUrl || (youTubeVideoId ? youtubeHqThumbnail(youTubeVideoId) : null);

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
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border/60 bg-muted"
          />
        ) : (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              "bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border/60",
            )}
            aria-hidden
          >
            {channelInitial(channelLabel)}
          </span>
        )}
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
