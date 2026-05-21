import { Bookmark, FileText, MoreHorizontal, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  canCapture: boolean;
  saving: boolean;
  hasNote: boolean;
  /** Transcript tab: line bookmarks are primary; hide playhead bookmark duplicate. */
  transcriptTabActive?: boolean;
  /** Mobile sticky toolbar: icon-only buttons to save horizontal space. */
  iconOnly?: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onOpenNote: () => void;
  /** Opens study menu sheet (sections, transcript, artifact actions, capture extras). */
  onOpenStudyMenu: () => void;
};

export default function ArtifactQuickCaptureRow({
  canCapture,
  saving,
  hasNote,
  transcriptTabActive = false,
  iconOnly = false,
  onBookmark,
  onSaveNote,
  onOpenNote,
  onOpenStudyMenu,
}: Props) {
  return (
    <div
      className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-2 py-2 lg:hidden"
      role="toolbar"
      aria-label="Quick capture"
    >
      {!transcriptTabActive ? (
        <Button
          size="sm"
          className={cn(
            "h-9 font-medium",
            iconOnly ? "w-9 shrink-0 px-0" : "min-w-0 flex-1 gap-1.5",
          )}
          onClick={onBookmark}
          disabled={!canCapture || saving}
          aria-label="Mark moment"
        >
          <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
          {iconOnly ? null : "Mark moment"}
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "h-9 shrink-0",
          iconOnly ? "w-9 px-0" : "gap-1",
          !iconOnly && transcriptTabActive && "min-w-0 flex-1",
        )}
        onClick={() => {
          onOpenNote();
          if (hasNote) onSaveNote();
        }}
        disabled={!canCapture || saving}
        aria-label="Note"
      >
        {iconOnly ? (
          <FileText className="h-4 w-4" aria-hidden />
        ) : (
          <>
            <StickyNote className="h-3.5 w-3.5" aria-hidden />
            Note
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-9 shrink-0", iconOnly ? "w-9 px-0" : "gap-1 px-2")}
        aria-label="More — study menu"
        onClick={onOpenStudyMenu}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        {iconOnly ? null : "More"}
      </Button>
    </div>
  );
}
