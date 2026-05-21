import { Bookmark, Clock, NotebookPen, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type TranscriptSegmentBookmarkActions = {
  onMakeNote: () => void;
  onSaveBookmark: () => void;
  onJournal: () => void;
  onResearchLater: () => void;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stamp: string | null;
  snippet: string;
  disabled?: boolean;
  actions: TranscriptSegmentBookmarkActions;
};

export default function TranscriptSegmentBookmarkSheet({
  open,
  onOpenChange,
  stamp,
  snippet,
  disabled,
  actions,
}: Props) {
  const title = stamp ? `At ${stamp}` : "This line";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-base font-normal">Bookmark this</SheetTitle>
          <SheetDescription className="line-clamp-2 text-left text-sm text-muted-foreground">
            {title}
            {snippet ? ` — ${snippet}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-3 px-4"
            disabled={disabled}
            onClick={actions.onMakeNote}
          >
            <StickyNote className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            Make a note
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-3 px-4"
            disabled={disabled}
            onClick={actions.onSaveBookmark}
          >
            <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            Save it
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-3 px-4"
            disabled={disabled}
            onClick={actions.onJournal}
          >
            <NotebookPen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            Journal it
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-3 px-4"
            disabled={disabled}
            onClick={actions.onResearchLater}
          >
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            Save for research later
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
