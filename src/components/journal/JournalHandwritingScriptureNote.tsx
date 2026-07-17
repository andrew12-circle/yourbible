import { NotebookPen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  compact?: boolean;
  onStart?: () => void;
}

export default function JournalHandwritingScriptureNote({
  className,
  compact = false,
  onStart,
}: Props) {
  const content = (
    <>
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          className={cn(
            "mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary",
            compact ? "h-9 w-9" : "h-10 w-10",
          )}
          aria-hidden
        >
          <NotebookPen className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-foreground">
            Write Scripture by hand
            <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          </span>
          <span className={cn("mt-1 block text-muted-foreground", compact ? "text-[12px] leading-snug" : "text-sm leading-6")}>
            Research on learning points to handwriting as a powerful way to slow down,
            remember, and reflect. When you journal, copy a verse with the pen first,
            then let your notes become prayer, pattern recognition, and action.
          </span>
        </span>
      </div>
      {onStart && (
        <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
          Use the pen
        </span>
      )}
    </>
  );

  if (onStart) {
    return (
      <button
        type="button"
        onClick={onStart}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-left shadow-sm transition hover:border-primary/25 hover:bg-primary/10",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <aside
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 shadow-sm",
        className,
      )}
    >
      {content}
    </aside>
  );
}
