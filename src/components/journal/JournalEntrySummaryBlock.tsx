import { Loader2 } from "lucide-react";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { cn } from "@/lib/utils";

type Props = {
  summary: string;
  onSummaryChange?: (value: string) => void;
  summarizing?: boolean;
  className?: string;
  showFullTextLabel?: boolean;
};

/** Summary block shown above full journal body (video journals, sketches, etc.). */
export function JournalEntrySummaryBlock({
  summary,
  onSummaryChange,
  summarizing = false,
  className,
  showFullTextLabel = false,
}: Props) {
  const hasSummary = Boolean(summary.trim());

  if (!hasSummary && !summarizing) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <section aria-label="Entry summary">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Summary
        </p>
        {summarizing && !hasSummary ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Crunching your journal into a summary…
          </p>
        ) : onSummaryChange ? (
          <PolishedTextarea
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            placeholder="AI summary will appear here…"
            className="min-h-[4.5rem] resize-none border-0 bg-transparent px-0 py-0 font-sans text-[16px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        ) : (
          <p className="font-sans text-[16px] leading-relaxed text-foreground whitespace-pre-wrap">
            {summary}
          </p>
        )}
      </section>
      {showFullTextLabel && hasSummary ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Full text
        </p>
      ) : null}
    </div>
  );
}
