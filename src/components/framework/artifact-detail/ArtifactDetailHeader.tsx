import { ExternalLink, Loader2, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { youtubeHqThumbnail } from "@/lib/youtube";

export type ArtifactDetailHeaderProps = {
  displayTitle: string;
  statusLabel: string;
  inFlight: boolean;
  channel?: string | null;
  channelUrl?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  onScrollToVideo: () => void;
};

export default function ArtifactDetailHeader({
  displayTitle,
  statusLabel,
  inFlight,
  channel,
  channelUrl,
  thumbnailUrl,
  youTubeVideoId,
  onScrollToVideo,
}: ArtifactDetailHeaderProps) {
  const thumb = thumbnailUrl || (youTubeVideoId ? youtubeHqThumbnail(youTubeVideoId) : null);

  const badges = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600/10 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
        <Youtube className="h-3 w-3 shrink-0" aria-hidden />
        YouTube
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
          inFlight
            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
            : "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            inFlight ? "animate-pulse bg-amber-500" : "bg-emerald-500",
          )}
          aria-hidden
        />
        {inFlight ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden /> : null}
        {statusLabel}
      </span>
    </div>
  );

  const channelLine = channel ? (
    <p className="truncate text-xs text-muted-foreground">
      {channelUrl ? (
        <a
          href={channelUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 hover:text-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate">{channel}</span>
          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        </a>
      ) : (
        channel
      )}
    </p>
  ) : null;

  return (
    <div className="min-w-0 space-y-2 sm:space-y-0">
      <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3.5">
        {thumb ? (
          <button
            type="button"
            onClick={onScrollToVideo}
            className="group relative shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-border/50 transition hover:ring-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-xl"
            aria-label="Scroll to video"
          >
            <img
              src={thumb}
              alt=""
              className="h-11 w-[4.5rem] object-cover bg-muted transition duration-200 group-hover:scale-[1.02] sm:h-16 sm:w-28"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
              <Youtube className="h-4 w-4 text-white opacity-0 drop-shadow transition group-hover:opacity-100 sm:h-5 sm:w-5" aria-hidden />
            </span>
          </button>
        ) : (
          <span className="flex h-11 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-red-600/10 ring-1 ring-border/50 sm:h-16 sm:w-28 sm:rounded-xl">
            <Youtube className="h-5 w-5 text-red-600 sm:h-6 sm:w-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[15px] font-normal leading-snug text-foreground line-clamp-2 sm:text-lg md:line-clamp-3">
            {displayTitle}
          </h1>
          <div className="mt-1 sm:hidden">{channelLine}</div>
          <div className="mt-1.5 hidden sm:block">{badges}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-[calc(4.5rem+0.625rem)] sm:hidden">
        {badges}
      </div>
      {channel ? <div className="hidden min-w-0 sm:block">{channelLine}</div> : null}
    </div>
  );
}
