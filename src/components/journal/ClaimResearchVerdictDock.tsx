import { Check, Clock, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLAIM_VERDICT_LABELS, type ClaimVerdict } from "@/lib/framework/claimVerdict";
import { claimResearchColumn } from "@/lib/journal/claimResearchTheme";

const VERDICTS: {
  verdict: ClaimVerdict;
  label: string;
  icon: typeof Check;
}[] = [
  { verdict: "keep", label: CLAIM_VERDICT_LABELS.keep, icon: Check },
  { verdict: "reject", label: CLAIM_VERDICT_LABELS.reject, icon: X },
  { verdict: "updated", label: CLAIM_VERDICT_LABELS.updated, icon: Pencil },
  { verdict: "defer", label: "Later", icon: Clock },
];

type Props = {
  busy?: boolean;
  onVerdict: (verdict: ClaimVerdict) => void;
  onUpdateBelief?: () => void;
  className?: string;
};

export default function ClaimResearchVerdictDock({ busy = false, onVerdict, onUpdateBelief, className }: Props) {
  return (
    <div className={cn("shrink-0 border-t border-border/40 px-4 py-4", className)}>
      <div className={claimResearchColumn}>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Your decision on this claim</p>
          {onUpdateBelief ? (
            <button
              type="button"
              disabled={busy}
              onClick={onUpdateBelief}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
            >
              Update belief
            </button>
          ) : null}
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Claim verdict"
        >
          {VERDICTS.map(({ verdict, label, icon: Icon }) => (
            <button
              key={verdict}
              type="button"
              disabled={busy}
              onClick={() => onVerdict(verdict)}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-2 text-xs font-medium text-foreground/80",
                "transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
