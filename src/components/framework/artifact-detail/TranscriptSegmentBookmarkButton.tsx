import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  studyTranscript: boolean;
  isActive: boolean;
  isMarked: boolean;
  disabled?: boolean;
  stamp: string | null;
  startSeconds: number;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  layout: "inline" | "absolute";
};

export function bookmarkRibbonKey(seconds: number): number {
  return Math.max(0, Math.floor(seconds));
}

export default function TranscriptSegmentBookmarkButton({
  studyTranscript,
  isActive,
  isMarked,
  disabled,
  stamp,
  startSeconds,
  onClick,
  layout,
}: Props) {
  const clock = stamp ?? undefined;

  return (
    <Button
      type="button"
      variant="ghost"
      size={studyTranscript ? "sm" : "icon"}
      className={cn(
        "group/bookmark shrink-0 transition-colors",
        layout === "inline" ? "h-8 w-8 rounded-full p-0" : "absolute right-2 top-2 h-8 w-8",
        studyTranscript
          ? isMarked
            ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:text-red-400"
            : isActive
              ? "bg-white/10 text-white/80 shadow-sm hover:bg-red-500/20 hover:text-red-400"
              : "text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          : isMarked
            ? "text-red-500 hover:text-red-500"
            : "text-muted-foreground hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
        layout === "absolute" && !studyTranscript && "right-1.5",
        studyTranscript && layout === "absolute" && "opacity-100",
      )}
      disabled={disabled}
      aria-label={`Bookmark at ${clock ?? startSeconds}`}
      aria-pressed={isMarked}
      title={isMarked ? "Bookmarked" : "Bookmark this line"}
      onClick={onClick}
    >
      <Bookmark
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-colors",
          isMarked
            ? "text-red-500 fill-red-500"
            : studyTranscript && isActive
              ? "text-white/80 group-hover/bookmark:text-red-400 group-hover/bookmark:fill-red-400/50"
              : "group-hover/bookmark:text-red-500 group-hover/bookmark:fill-red-500/40",
        )}
        aria-hidden
      />
    </Button>
  );
}
