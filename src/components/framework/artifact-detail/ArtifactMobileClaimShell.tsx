import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { artifactScrollMtMobile } from "@/lib/framework/artifactSurfaces";
import { formatClaimVerdict, isDeferredVerdict } from "@/lib/framework/claimVerdict";
import { cn } from "@/lib/utils";

type ClaimLike = {
  id: string;
  claim: string;
  verdict: string | null;
};

type Props = {
  claim: ClaimLike;
  claimNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export default function ArtifactMobileClaimShell({
  claim,
  claimNumber,
  open,
  onOpenChange,
  children,
}: Props) {
  const verdictAccent =
    claim.verdict === "keep"
      ? "border-l-emerald-500"
      : claim.verdict === "reject"
        ? "border-l-rose-500"
        : claim.verdict === "updated"
          ? "border-l-indigo-500"
          : isDeferredVerdict(claim.verdict)
            ? "border-l-amber-500"
            : "border-l-border";

  return (
    <Collapsible
      id={claim.id}
      data-claim-number={claimNumber}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        artifactScrollMtMobile,
        "overflow-hidden rounded-lg border border-border/55 bg-card/90 shadow-none",
        "border-l-[3px]",
        verdictAccent,
        isDeferredVerdict(claim.verdict) && "ring-1 ring-amber-400/35",
      )}
    >
      <CollapsibleTrigger className="flex w-full min-h-11 items-start gap-2.5 p-3 text-left transition hover:bg-muted/20 active:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span
          className="shrink-0 font-mono text-sm font-semibold tabular-nums text-muted-foreground"
          aria-hidden
        >
          #{claimNumber}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-display text-[15px] leading-snug text-foreground line-clamp-3">{claim.claim}</p>
          {claim.verdict ? (
            <span
              className={cn(
                "inline-flex text-[10px] uppercase tracking-wider px-2 py-0.5 rounded",
                isDeferredVerdict(claim.verdict)
                  ? "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100"
                  : "bg-foreground text-background",
              )}
            >
              {formatClaimVerdict(claim.verdict)}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tap to review</span>
          )}
        </div>
        <ChevronDown
          className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/40 bg-muted/10 px-3 pb-3 pt-2.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
