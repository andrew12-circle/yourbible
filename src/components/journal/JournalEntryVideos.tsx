import { Trash2 } from "lucide-react";
import type { JournalVideoRow } from "@/lib/journal/videos";
import { cn } from "@/lib/utils";

type Props = {
  videos: JournalVideoRow[];
  onRemove?: (id: string, storagePath: string) => void;
  className?: string;
  /** When transcript is edited inline below the video in the body, skip duplicate caption. */
  hideTranscript?: boolean;
};

export default function JournalEntryVideos({ videos, onRemove, className, hideTranscript }: Props) {
  if (!videos.length) return null;

  return (
    <div className={cn("my-4 flex flex-col gap-3", className)}>
      {videos.map((v) => (
        <div key={v.id} className="group relative overflow-hidden rounded-xl bg-black/5 dark:bg-black/30">
          {v.url ? (
            <video
              src={v.url}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[min(70vh,480px)] object-contain bg-black"
            />
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
