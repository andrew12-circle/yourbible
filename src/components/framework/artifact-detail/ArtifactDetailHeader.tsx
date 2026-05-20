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

  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
      {thumb ? (
        <button
          type="button"
          onClick={onScrollToVideo}
          className="group relative shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-border/50 transition hover:ring-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Scroll to video"
        >
          <img
            src={thumb}
            alt=""
            className="h-14 w-[5.25rem] object-cover bg-muted transition duration-200 group-hover:scale-[1.02] sm:h-16 sm:w-28"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
            <Youtube className="h-5 w-5 text-white opacity-0 drop-shadow transition group-hover:opacity-100" aria-hidden />
          </span>
        </button>
      ) : (
        <span className="flex h-14 w-[5.25rem] shrink-0 items-center justify-center rounded-xl bg-red-600/10 ring-1 ring-border/50 sm:h-16 sm:w-28">
          <Youtube className="h-6 w-6 text-red-600" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600/10 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
            <Youtube className="h-3 w-3" aria-hidden />
            YouTube
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
              inFlight
                ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                : "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                inFlight ? "animate-pulse bg-amber-500" : "bg-emerald-500",
              )}
              aria-hidden
            />
            {inFlight ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            {statusLabel}
          </span>
        </div>
        <h1 className="font-display text-base font-normal leading-snug text-foreground line-clamp-2 sm:text-lg md:line-clamp-3">
          {displayTitle}
        </h1>
        {channel ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
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
        ) : null}
      </div>
    </div>
  );
}
