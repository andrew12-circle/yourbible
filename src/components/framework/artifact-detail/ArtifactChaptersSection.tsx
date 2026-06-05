import { ArrowRight, ChevronRight, LayoutList, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-desktop";
import {
  artifactCard,
  artifactHorizontalRail,
  artifactRailCard,
  artifactScrollMt,
} from "@/lib/framework/artifactSurfaces";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

type Props = {
  status: string;
  rawText: string;
  chapters: YoutubeChapter[];
  chaptersSourceLabel: string | null;
  generatingChapters: boolean;
  syncingYoutubeChapters?: boolean;
  inFlight: boolean;
  onSyncYouTubeChapters?: () => void;
  onGenerateChapters: (hasChapters: boolean) => void;
  onSeekChapter: (seconds: number) => void;
};

export default function ArtifactChaptersSection({
  status,
  rawText,
  chapters,
  chaptersSourceLabel,
  generatingChapters,
  syncingYoutubeChapters = false,
  inFlight,
  onSyncYouTubeChapters,
  onGenerateChapters,
  onSeekChapter,
}: Props) {
  const isDesktop = useIsDesktop();

  return (
    <section
      id="chapters"
      className={cn(isDesktop ? cn(artifactCard, artifactScrollMt, "mb-6 p-4 sm:p-5") : "mb-0")}
    >
      {status === "ready" && (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {chaptersSourceLabel ?? (
            <>
              <span className="font-medium text-foreground">Chapters</span> help you jump through the talk. We use the
              creator&apos;s description timestamps when available; otherwise we outline sections from your transcript.
            </>
          )}
        </p>
      )}
      <div
        className={cn(
          "mb-3 flex flex-wrap items-center gap-2",
          isDesktop ? "text-sm font-medium" : "text-xs",
        )}
      >
        {isDesktop ? (
          <>
            <LayoutList className="h-4 w-4 text-muted-foreground" aria-hidden />
            Chapters
          </>
        ) : (
          <span className="font-medium text-foreground">Outline</span>
        )}
        {chapters.length > 0 && (
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {chapters.length} section{chapters.length === 1 ? "" : "s"}
          </span>
        )}
        {status === "ready" && (
          <div className={cn("flex flex-wrap items-center gap-1.5", isDesktop ? "ml-auto" : "w-full")}>
            {chapters.length === 0 && onSyncYouTubeChapters ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={syncingYoutubeChapters || generatingChapters || inFlight}
                onClick={() => onSyncYouTubeChapters()}
              >
                {syncingYoutubeChapters ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                )}
                {syncingYoutubeChapters ? "Syncing…" : "Sync from YouTube"}
              </Button>
            ) : null}
            {rawText ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={generatingChapters || syncingYoutubeChapters || inFlight}
                onClick={() => onGenerateChapters(chapters.length > 0)}
              >
                {generatingChapters ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {generatingChapters
                  ? "Generating…"
                  : chapters.length > 0
                    ? "Regenerate"
                    : "Generate from transcript"}
              </Button>
            ) : null}
          </div>
        )}
      </div>
      {chapters.length > 0 ? (
        isDesktop ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {chapters.map((chapter, idx) => (
              <button
                key={`${chapter.start_seconds}-${idx}`}
                type="button"
                onClick={() => onSeekChapter(chapter.start_seconds)}
                className={cn(
                  "rounded-lg border border-border/70 bg-muted/10 p-3 text-left text-sm transition",
                  "hover:border-foreground/35 hover:bg-muted/25 active:bg-muted/35",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-snug">{chapter.title}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatTranscriptClock(chapter.start_seconds)}
                  </span>
                </div>
                <span className="mt-2 inline-flex items-center text-xs text-muted-foreground">
                  Jump to this point <ArrowRight className="ml-1 h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className={artifactHorizontalRail}>
            {chapters.map((chapter, idx) => (
              <button
                key={`${chapter.start_seconds}-${idx}`}
                type="button"
                onClick={() => onSeekChapter(chapter.start_seconds)}
                className={cn(artifactRailCard, "flex min-h-[120px] flex-col justify-between")}
              >
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    {formatTranscriptClock(chapter.start_seconds)}
                  </span>
                  <p className="mt-2 font-display text-[15px] font-semibold leading-snug text-foreground line-clamp-3">
                    {chapter.title}
                  </p>
                </div>
                <span className="mt-3 inline-flex items-center justify-end text-xs text-muted-foreground">
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        )
      ) : status === "ready" ? (
        <p className="text-xs text-muted-foreground">
          {generatingChapters
            ? "Outlining sections from your transcript…"
            : "No chapters yet. Tap Generate from transcript, or wait — we try automatically when the transcript is ready."}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Chapters appear after the transcript is ready.</p>
      )}
    </section>
  );
}
