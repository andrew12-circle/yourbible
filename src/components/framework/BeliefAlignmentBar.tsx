import type { BeliefAlignmentBreakdown } from "@/lib/framework/artifactCorpusStanding";
import { cn } from "@/lib/utils";

type Props = {
  alignment: BeliefAlignmentBreakdown;
  className?: string;
  showLegend?: boolean;
};

export function BeliefAlignmentBar({ alignment, className, showLegend = true }: Props) {
  if (alignment.total <= 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No claims extracted yet — alignment appears after analysis.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Belief alignment: ${alignment.agreePct}% agree, ${alignment.disagreePct}% conflict, ${alignment.newPct}% new ground`}
      >
        {alignment.agree > 0 ? (
          <div
            className="h-full bg-emerald-500/80"
            style={{ width: `${alignment.agreePct}%` }}
            title={`${alignment.agree} agree`}
          />
        ) : null}
        {alignment.disagree > 0 ? (
          <div
            className="h-full bg-rose-500/75"
            style={{ width: `${alignment.disagreePct}%` }}
            title={`${alignment.disagree} conflict`}
          />
        ) : null}
        {alignment.new > 0 ? (
          <div
            className="h-full bg-amber-500/75"
            style={{ width: `${alignment.newPct}%` }}
            title={`${alignment.new} new ground`}
          />
        ) : null}
      </div>
      {showLegend ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500/80" aria-hidden />
            Aligns {alignment.agreePct}% ({alignment.agree})
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500/75" aria-hidden />
            Conflicts {alignment.disagreePct}% ({alignment.disagree})
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500/75" aria-hidden />
            New {alignment.newPct}% ({alignment.new})
          </span>
        </div>
      ) : null}
    </div>
  );
}
