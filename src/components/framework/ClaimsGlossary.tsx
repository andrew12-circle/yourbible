import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  /** Flatter mobile index under Claims section. */
  compact?: boolean;
  className?: string;
  /** Persist index open state per artifact when set. */
  storageKey?: string;
  /** Open index by default when no stored preference. */
  defaultOpen?: boolean;
}

function readStoredOpen(key: string): boolean | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

export default function ClaimsGlossary({
  entries,
  onJump,
  compact = false,
  className,
  storageKey,
  defaultOpen = false,
}: ClaimsGlossaryProps) {
  const triggerId = useId();
  const [open, setOpen] = useState(() => {
    if (storageKey) {
      const stored = readStoredOpen(storageKey);
      if (stored != null) return stored;
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (!storageKey) return;
    const stored = readStoredOpen(storageKey);
    if (stored != null) setOpen(stored);
  }, [storageKey]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
  };

  if (entries.length === 0) return null;

  return (
    <Collapsible
      id="claims-index"
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "scroll-mt-24 text-sm",
        compact
          ? "border-b border-border/50 pb-3"
          : "rounded-lg border border-border/70 bg-card/50 shadow-sm",
        className,
      )}
    >
      <CollapsibleTrigger
        id={triggerId}
        aria-label="Claims index"
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact
            ? "min-h-10 py-1 hover:bg-muted/30 active:bg-muted/40"
            : "rounded-lg px-3 py-2.5 hover:bg-muted/25",
        )}
      >
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "font-medium uppercase tracking-wider text-muted-foreground",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            Claims index
          </span>
          <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>
            {entries.length} {entries.length === 1 ? "claim" : "claims"} — jump to a card
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(compact ? "pt-1.5" : "border-t border-border/50 px-3 pb-3 pt-2")}>
        <ol
          className={cn(
            "space-y-0.5 overflow-y-auto pr-1",
            compact ? "max-h-36" : "max-h-48 sm:max-h-64",
          )}
        >
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onJump(entry.number)}
                className={cn(
                  "group flex w-full min-h-10 items-start gap-2 rounded-md px-1.5 py-2 text-left transition",
                  compact ? "hover:bg-muted/50 active:bg-muted/60" : "px-2 hover:bg-muted/70",
                )}
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
      </CollapsibleContent>
    </Collapsible>
  );
}
