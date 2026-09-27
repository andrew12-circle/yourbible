import type { MouseEvent } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function keepEditorFocus(event: MouseEvent<HTMLButtonElement>) {
  // Blurring the editor can resize the keyboard viewport and move this card
  // between press and click. Keep focus in place; dismiss on click so a
  // cancelled touch/scroll gesture does not accidentally dismiss the prompt.
  if (event.button === 0) event.preventDefault();
}

export function NewJournalEntryPhotoSuggestion({
  onAddPhotos,
  onTakePhoto,
  onDismiss,
  className,
}: {
  onAddPhotos: () => void;
  onTakePhoto: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/30 bg-primary/[0.06] p-3 shadow-sm",
        className,
      )}
      role="region"
      aria-label="Photo suggestion"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/12 p-2 text-primary" aria-hidden>
          <ImagePlus className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-foreground">
            Add photos from this moment?
          </p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            This sounds like an event worth remembering — pull pictures straight from your iPhone camera roll.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="h-11 gap-1.5 px-4 text-[15px]" onClick={onAddPhotos}>
              <ImagePlus className="h-4 w-4" />
              Choose photos
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-11 gap-1.5 px-4 text-[15px]"
              onClick={onTakePhoto}
            >
              <Camera className="h-4 w-4" />
              Take photo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-11 touch-manipulation px-4 text-[15px]"
              onPointerDown={keepEditorFocus}
              onMouseDown={keepEditorFocus}
              onClick={onDismiss}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onPointerDown={keepEditorFocus}
          onMouseDown={keepEditorFocus}
          onClick={onDismiss}
          className="flex h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Dismiss photo suggestion"
        >
          <X className="pointer-events-none h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
