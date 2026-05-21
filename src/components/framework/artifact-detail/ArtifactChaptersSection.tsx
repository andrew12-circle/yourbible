import { ArrowRight, LayoutList, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { artifactCard, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

type Props = {
  status: string;
  rawText: string;
  chapters: YoutubeChapter[];
  chaptersSourceLabel: string | null;
  generatingChapters: boolean;
  inFlight: boolean;
  onGenerateChapters: (hasChapters: boolean) => void;
  onSeekChapter: (seconds: number) => void;
};

export default function ArtifactChaptersSection({
  status,
  rawText,
  chapters,
  chaptersSourceLabel,
  generatingChapters,
  inFlight,
  onGenerateChapters,
  onSeekChapter,
}: Props) {
  return (
    <section id="chapters" className={cn(artifactCard, artifactScrollMt, "mb-6 p-4 sm:p-5")}>
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
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium">
        <LayoutList className="h-4 w-4 text-muted-foreground" aria-hidden />
        Chapters
        {chapters.length > 0 && (
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {chapters.length} section{chapters.length === 1 ? "" : "s"}
          </span>
        )}
        {status === "ready" && rawText && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto h-7 text-xs"
            disabled={generatingChapters || inFlight}
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
        )}
      </div>
      {chapters.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {chapters.map((chapter, idx) => (
            <button
              key={`${chapter.start_seconds}-${idx}`}
              type="button"
              onClick={() => onSeekChapter(chapter.start_seconds)}
              className="rounded-lg border border-border bg-muted/15 p-3 text-left text-sm transition hover:border-foreground/40 hover:bg-muted/30"
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
