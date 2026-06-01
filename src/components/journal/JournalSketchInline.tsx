import { PenLine, Trash2 } from "lucide-react";
import { isJournalSketchAsset } from "@/lib/journal/sketchPhotos";
import { cn } from "@/lib/utils";

export type JournalSketchPhoto = {
  id: string;
  storage_path: string;
  url?: string;
};

type Props = {
  sketches: JournalSketchPhoto[];
  onOpenSketch?: () => void;
  onRemove?: (id: string, storage_path: string) => void;
  className?: string;
};

/** Full-width handwriting preview — reads like part of the entry, not a tiny attachment. */
export function JournalSketchInline({ sketches, onOpenSketch, onRemove, className }: Props) {
  if (sketches.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {sketches.map((sketch) => (
        <div
          key={sketch.id}
          className="group relative overflow-hidden rounded-xl border border-border/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:bg-neutral-950"
        >
          {onOpenSketch ? (
            <button
              type="button"
              onClick={onOpenSketch}
              className="block w-full text-left"
              aria-label="Edit handwritten note"
            >
              {sketch.url ? (
                <img
                  src={sketch.url}
                  alt="Handwritten journal note"
                  className="w-full max-h-[min(72vh,640px)] object-contain bg-white"
                />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                  Handwritten note
                </div>
              )}
            </button>
          ) : sketch.url ? (
            <img
              src={sketch.url}
              alt="Handwritten journal note"
              className="w-full max-h-[min(72vh,640px)] object-contain bg-white"
            />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
              Handwritten note
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <PenLine className="h-3.5 w-3.5" aria-hidden />
              Handwritten
            </span>
            {onOpenSketch ? (
              <button
                type="button"
                onClick={onOpenSketch}
                className="font-medium text-primary hover:underline"
              >
                Edit
              </button>
            ) : null}
          </div>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(sketch.id, sketch.storage_path)}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              aria-label="Remove handwritten note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function partitionJournalPhotos<T extends { storage_path: string }>(photos: T[]) {
  const sketches: T[] = [];
  const attachments: T[] = [];
  for (const photo of photos) {
    if (isJournalSketchAsset(photo.storage_path)) sketches.push(photo);
    else attachments.push(photo);
  }
  return { sketches, attachments };
}
