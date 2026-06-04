import { Check, Clock, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLAIM_VERDICT_LABELS, type ClaimVerdict } from "@/lib/framework/claimVerdict";

const VERDICTS: {
  verdict: ClaimVerdict;
  label: string;
  icon: typeof Check;
  tone: string;
}[] = [
  {
    verdict: "keep",
    label: CLAIM_VERDICT_LABELS.keep,
    icon: Check,
    tone: "hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300",
  },
  {
    verdict: "reject",
    label: CLAIM_VERDICT_LABELS.reject,
    icon: X,
    tone: "hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300",
  },
  {
    verdict: "updated",
    label: CLAIM_VERDICT_LABELS.updated,
    icon: Pencil,
    tone: "hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300",
  },
  {
    verdict: "defer",
    label: "Later",
    icon: Clock,
    tone: "hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-200",
  },
];

type Props = {
  busy?: boolean;
  onVerdict: (verdict: ClaimVerdict) => void;
  onUpdateBelief?: () => void;
  className?: string;
};

/** Sticky verdict bar — segmented control style. */
export default function ClaimResearchVerdictDock({ busy = false, onVerdict, onUpdateBelief, className }: Props) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border/50 bg-muted/20 px-3 py-3 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Your decision</p>
        {onUpdateBelief ? (
          <button
            type="button"
            disabled={busy}
            onClick={onUpdateBelief}
            className="text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
          >
            Update belief
          </button>
        ) : null}
      </div>
      <div
        className="grid grid-cols-4 gap-1 rounded-xl border border-border/60 bg-card/80 p-1 shadow-sm"
        role="group"
        aria-label="Claim verdict"
      >
        {VERDICTS.map(({ verdict, label, icon: Icon, tone }) => (
          <button
            key={verdict}
            type="button"
            disabled={busy}
            onClick={() => onVerdict(verdict)}
            className={cn(
              "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors",
              "disabled:pointer-events-none disabled:opacity-40",
              tone,
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span className="leading-none">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
