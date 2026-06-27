import { Loader2, Mic, Trash2 } from "lucide-react";
import type { JournalVideoRow } from "@/lib/journal/videos";
import JournalEntryVideoPlayer from "@/components/journal/JournalEntryVideoPlayer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  videos: JournalVideoRow[];
  onRemove?: (id: string, storagePath: string) => void;
  onRetranscribe?: (video: JournalVideoRow) => void;
  retranscribingId?: string | null;
  className?: string;
  /** When transcript is edited inline below the video in the body, skip duplicate caption. */
  hideTranscript?: boolean;
};

export default function JournalEntryVideos({
  videos,
  onRemove,
  onRetranscribe,
  retranscribingId = null,
  className,
  hideTranscript,
}: Props) {
  if (!videos.length) return null;

  return (
    <div className={cn("my-4 flex flex-col gap-3", className)}>
      {videos.map((v) => (
        <div key={v.id} className="group relative overflow-hidden rounded-xl bg-black/5 dark:bg-black/30">
          {v.url ? (
            <JournalEntryVideoPlayer url={v.url} durationMs={v.duration_ms} mimeType={v.mime_type} />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Video unavailable
            </div>
          )}
          {v.transcript?.trim() && !hideTranscript ? (
            <p className="border-t border-border/40 bg-background/80 px-4 py-3 text-[15px] leading-relaxed text-foreground/90">
              {v.transcript}
            </p>
          ) : null}
          {onRetranscribe ? (
            <div className="flex justify-end border-t border-border/40 bg-background/80 px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                disabled={retranscribingId === v.id}
                onClick={() => onRetranscribe(v)}
              >
                {retranscribingId === v.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Mic className="h-3.5 w-3.5" aria-hidden />
                )}
                {retranscribingId === v.id ? "Transcribing…" : "Transcribe again"}
              </Button>
            </div>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(v.id, v.storage_path)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remove video"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
