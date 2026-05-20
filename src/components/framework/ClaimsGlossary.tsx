import { cn } from "@/lib/utils";
import { formatClaimVerdict, isDeferredVerdict } from "@/lib/framework/claimVerdict";

export interface ClaimsGlossaryEntry {
  id: string;
  claim: string;
  verdict: string | null;
  /** 1-based claim number */
  number: number;
}

interface ClaimsGlossaryProps {
  entries: ClaimsGlossaryEntry[];
  onJump: (claimNumber: number) => void;
  className?: string;
}

export default function ClaimsGlossary({ entries, onJump, className }: ClaimsGlossaryProps) {
  if (entries.length === 0) return null;

  return (
    <nav
      id="claims-index"
      aria-label="Claims index"
      className={cn(
        "scroll-mt-24 rounded-lg border border-border bg-card/80 p-3 text-sm shadow-sm",
        className,
      )}
    >
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Claims index
      </div>
      <ol className="max-h-48 space-y-1 overflow-y-auto pr-1 sm:max-h-64">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onJump(entry.number)}
              className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-muted/70"
            >
              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground group-hover:text-foreground">
                #{entry.number}
              </span>
              <span className="min-w-0 flex-1 line-clamp-2 text-foreground/90 group-hover:text-foreground">
                {entry.claim}
              </span>
              {entry.verdict ? (
                <span
                  className={cn(
                    "shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                    isDeferredVerdict(entry.verdict)
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {formatClaimVerdict(entry.verdict)}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
