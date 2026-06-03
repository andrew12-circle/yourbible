import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

export type ArtifactJournalSourceMetaProps = {
  channel?: string | null;
  channelUrl?: string | null;
  author?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  providerName?: string | null;
  className?: string;
};

function channelInitial(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const first = trimmed.replace(/^@/, "").charAt(0);
  return first ? first.toUpperCase() : "?";
}

function primaryChannelLabel(props: ArtifactJournalSourceMetaProps): string | null {
  return props.channel?.trim() || props.providerName?.trim() || null;
}

function authorDiffersFromChannel(channel: string | null, author: string | null): boolean {
  if (!channel || !author) return false;
  return channel.localeCompare(author, undefined, { sensitivity: "accent" }) !== 0;
}

export function hasArtifactJournalSourceMeta(props: ArtifactJournalSourceMetaProps): boolean {
  return Boolean(
    primaryChannelLabel(props) ||
      props.author?.trim() ||
      props.thumbnailUrl?.trim() ||
      props.youTubeVideoId,
  );
}

export default function ArtifactJournalSourceMeta({
  channel,
  channelUrl,
  author,
  thumbnailUrl,
  youTubeVideoId,
  providerName,
  className,
}: ArtifactJournalSourceMetaProps) {
  const channelTrim = channel?.trim() || null;
  const primary = channelTrim || providerName?.trim() || null;
  const authorTrim = author?.trim() || null;
  const showAuthorLine = authorDiffersFromChannel(primary, authorTrim);
  const headline = primary || authorTrim;
  const subline = primary && showAuthorLine ? authorTrim : null;

  if (!hasArtifactJournalSourceMeta({ channel, author, thumbnailUrl, youTubeVideoId, providerName })) {
    return null;
  }

  const avatarSrc = thumbnailUrl?.trim() || (youTubeVideoId ? youtubeHqThumbnail(youTubeVideoId) : null);
  const fallbackLabel = headline || providerName?.trim() || "Source";

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border/60 bg-muted"
        />
      ) : (
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            "bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-border/60",
          )}
          aria-hidden
        >
          {channelInitial(fallbackLabel)}
        </span>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        {headline ? (
          channelUrl && channelTrim ? (
            <a
              href={channelUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
              <span className="truncate">{headline}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-55" aria-hidden />
            </a>
          ) : (
            <p className="truncate text-sm font-medium text-foreground">{headline}</p>
          )
        ) : null}
        {subline ? <p className="truncate text-xs text-muted-foreground">{subline}</p> : null}
      </div>
    </div>
  );
}
