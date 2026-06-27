import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Notes column placeholder — highlights & verse notes for the active chapter. */
export function ReaderNotesPanel({
  bookName,
  chapter,
  children,
  className,
}: {
  bookName: string;
  chapter: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      <div className="flex-shrink-0 border-b px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</p>
        <p className="text-sm font-medium truncate">
          {bookName} {chapter}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 text-sm text-muted-foreground">
        {children ?? (
          <p className="leading-relaxed">
            Select text in the Bible pane to highlight or add a verse note. Notes stay separate from
            Scripture.
          </p>
        )}
      </div>
    </div>
  );
}
