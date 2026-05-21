import { Bookmark, ChevronDown, MoreHorizontal, Sparkles, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  canCapture: boolean;
  saving: boolean;
  hasNote: boolean;
  hasTranscript: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onBelieve: () => void;
  onStudyJournal: () => void;
  onOpenJournalTimestamp: () => void;
  onOpenJournalFull: () => void;
  onOpenCapture: () => void;
};

export default function ArtifactQuickCaptureRow({
  canCapture,
  saving,
  hasNote,
  hasTranscript,
  onBookmark,
  onSaveNote,
  onBelieve,
  onStudyJournal,
  onOpenJournalTimestamp,
  onOpenJournalFull,
  onOpenCapture,
}: Props) {
  return (
    <div
      className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-2 py-2 lg:hidden"
      role="toolbar"
      aria-label="Quick capture"
    >
      <Button
        size="sm"
        className="h-9 min-w-0 flex-1 gap-1.5 font-medium"
        onClick={onBookmark}
        disabled={!canCapture || saving}
      >
        <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
        Mark moment
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 shrink-0 gap-1"
        onClick={() => {
          onOpenCapture();
          if (hasNote) onSaveNote();
        }}
        disabled={!canCapture || saving}
      >
        <StickyNote className="h-3.5 w-3.5" aria-hidden />
        Note
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1 px-2"
            disabled={!canCapture}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            More
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[min(100vw-2rem,16rem)]">
          <DropdownMenuItem onClick={onBelieve} disabled={saving}>
            <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden />
            I believe this
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStudyJournal}>Study journal</DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenJournalTimestamp} disabled={!canCapture}>
            Full-page journal at current time
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenJournalFull} disabled={!hasTranscript}>
            Full-page journal (full video)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
