import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ArtifactBookReaderContent from "@/components/framework/artifact-detail/ArtifactBookReaderContent";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  author?: string | null;
  rawText: string;
  chapters?: YoutubeChapter[];
  initialChapterIndex?: number | null;
};

export default function ArtifactBookReaderDialog({
  open,
  onOpenChange,
  title,
  author = null,
  rawText,
  chapters = [],
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,900px)] w-[min(96vw,920px)] flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-[920px]",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="line-clamp-2 font-display text-xl tracking-tight">{title}</DialogTitle>
              {author ? (
                <DialogDescription className="mt-0.5">{author}</DialogDescription>
              ) : (
                <DialogDescription className="sr-only">Book reader</DialogDescription>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close reader"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </DialogHeader>

        <ArtifactBookReaderContent
          title={title}
          author={author}
          rawText={rawText}
          chapters={chapters}
          className="min-h-0 flex-1"
          scrollClassName="h-[min(72vh,760px)]"
        />
      </DialogContent>
    </Dialog>
  );
}
