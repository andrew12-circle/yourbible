import { ArrowDown, ArrowUp, ImagePlus, Pin, StickyNote, Trash2 } from "lucide-react";
import { BackgroundPicker } from "@/components/vision-board/BackgroundPicker";
import { Button } from "@/components/ui/button";
import type { BackgroundKey } from "@/lib/vision-board/boardGeometry";
import { cn } from "@/lib/utils";

type Props = {
  background: BackgroundKey;
  onBackgroundChange: (key: BackgroundKey) => void;
  onAddPhoto: () => void;
  onAddNote: () => void;
  onAddPin: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  hasSelection: boolean;
  busy?: boolean;
  className?: string;
};

export function VisionBoardToolbar({
  background,
  onBackgroundChange,
  onAddPhoto,
  onAddNote,
  onAddPin,
  onDelete,
  onBringForward,
  onSendBackward,
  hasSelection,
  busy,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-background/95 px-2 py-2 shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onAddPhoto}>
        <ImagePlus className="mr-1.5 h-4 w-4" />
        Photo
      </Button>
      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onAddNote}>
        <StickyNote className="mr-1.5 h-4 w-4" />
        Note
      </Button>
      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onAddPin}>
        <Pin className="mr-1.5 h-4 w-4" />
        Pin
      </Button>
      <div className="mx-1 h-6 w-px bg-border" />
      <BackgroundPicker value={background} onChange={onBackgroundChange} />
      <div className="mx-1 h-6 w-px bg-border" />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={!hasSelection || busy}
        onClick={onBringForward}
        title="Bring forward"
        aria-label="Bring forward"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={!hasSelection || busy}
        onClick={onSendBackward}
        title="Send backward"
        aria-label="Send backward"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={!hasSelection || busy}
        onClick={onDelete}
        title="Delete"
        aria-label="Delete selected"
        className="text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
