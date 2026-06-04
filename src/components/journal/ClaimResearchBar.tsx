import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CLAIM_VERDICT_LABELS, type ClaimVerdict } from "@/lib/framework/claimVerdict";

const COMPACT_VERDICT_MAX_W = 480;

const VERDICT_ACTIONS: {
  verdict: ClaimVerdict;
  label: string;
  icon: typeof Check;
}[] = [
  { verdict: "updated", label: CLAIM_VERDICT_LABELS.updated, icon: Pencil },
  { verdict: "keep", label: CLAIM_VERDICT_LABELS.keep, icon: Check },
  { verdict: "reject", label: CLAIM_VERDICT_LABELS.reject, icon: X },
  { verdict: "defer", label: "Defer", icon: Clock },
];

function ClaimTextPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 120 || text.includes("\n");

  return (
    <div className="min-w-0">
      <p
        className={cn(
          "text-xs leading-snug text-foreground",
          !expanded && long && "line-clamp-2",
        )}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-0.5 text-[10px] font-medium text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export type ClaimResearchBarProps = {
  claimText: string;
  artifactId: string;
  matchedBeliefId?: string | null;
  artifactLinkLabel?: string;
  /** Auto-brief / refresh in progress */
  briefLoading?: boolean;
  /** Full report sheet fetch in progress */
  reportLoading?: boolean;
  verdictBusy?: boolean;
  lastResearchedLabel?: string | null;
  showResearchPack?: boolean;
  /** When false, verdicts render in ClaimResearchVerdictDock instead. */
  showInlineVerdicts?: boolean;
  onResearchPack?: () => void;
  onRefreshBrief?: () => void;
  onVerdict: (verdict: ClaimVerdict) => void;
  className?: string;
};

export default function ClaimResearchBar({
  claimText,
  artifactId,
  matchedBeliefId,
  artifactLinkLabel = "Artifact",
  briefLoading = false,
  reportLoading = false,
  verdictBusy = false,
  lastResearchedLabel,
  showResearchPack = true,
  showInlineVerdicts = true,
  onResearchPack,
  onRefreshBrief,
  onVerdict,
  className,
}: ClaimResearchBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [compactVerdicts, setCompactVerdicts] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.offsetWidth;
      setCompactVerdicts(w < COMPACT_VERDICT_MAX_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const linkBtnClass = "h-7 min-w-0 max-w-full gap-1 px-2 text-[11px]";
  const verdictBtnClass = "h-7 min-w-0 gap-1 px-2 text-[11px]";

  return (
    <section
      ref={rootRef}
      className={cn(
        "min-w-0 shrink-0 overflow-x-hidden border-b border-primary/20 bg-primary/[0.06] py-2 dark:bg-primary/[0.09]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">Claim</div>
        {lastResearchedLabel ? (
          <span className="text-[9px] text-muted-foreground">Researched {lastResearchedLabel}</span>
        ) : null}
      </div>
      <ClaimTextPreview text={claimText} />

      <div className="mt-2 space-y-1.5 min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className={linkBtnClass} asChild>
            <Link to={`/framework/artifacts/${artifactId}`}>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              {artifactLinkLabel}
            </Link>
          </Button>
          {matchedBeliefId ? (
            <Button size="sm" variant="outline" className={linkBtnClass} asChild>
              <Link to={`/framework/beliefs/${matchedBeliefId}`}>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                Belief
              </Link>
            </Button>
          ) : null}
          {showResearchPack && onResearchPack ? (
            <Button
              size="sm"
              variant="default"
              className={cn(linkBtnClass, "max-w-full")}
              disabled={reportLoading}
              onClick={onResearchPack}
            >
              {reportLoading ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
              ) : (
                <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
              )}
              <span className="truncate">Full report</span>
            </Button>
          ) : null}
          {onRefreshBrief ? (
            <Button
              size="sm"
              variant="outline"
              className={linkBtnClass}
              disabled={briefLoading}
              onClick={onRefreshBrief}
            >
              <RefreshCw className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">Refresh brief</span>
            </Button>
          ) : null}
        </div>

        {showInlineVerdicts ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1 border-t border-border/40 pt-1.5">
            {compactVerdicts ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(verdictBtnClass, "w-full justify-between sm:w-auto")}
                    disabled={verdictBusy}
                  >
                    Verdict
                    <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[10rem]">
                  {VERDICT_ACTIONS.map(({ verdict, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={verdict}
                      disabled={verdictBusy}
                      onClick={() => onVerdict(verdict)}
                    >
                      <Icon className="mr-2 h-3.5 w-3.5 opacity-70" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              VERDICT_ACTIONS.map(({ verdict, label, icon: Icon }) => (
                <Button
                  key={verdict}
                  size="sm"
                  variant={verdict === "updated" ? "secondary" : "outline"}
                  className={verdictBtnClass}
                  disabled={verdictBusy}
                  onClick={() => onVerdict(verdict)}
                >
                  <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  {label}
                </Button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
