import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, Loader2, MoreHorizontal, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  claimText: string;
  artifactId: string;
  matchedBeliefId?: string | null;
  lastResearchedLabel?: string | null;
  briefLoading?: boolean;
  reportLoading?: boolean;
  onOpenReport?: () => void;
  onRefreshBrief?: () => void;
  onOpenSettings?: () => void;
  className?: string;
};

export default function ClaimResearchHeader({
  claimText,
  artifactId,
  matchedBeliefId,
  lastResearchedLabel,
  briefLoading = false,
  reportLoading = false,
  onOpenReport,
  onRefreshBrief,
  onOpenSettings,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const long = claimText.length > 160 || claimText.includes("\n");

  return (
    <header
      className={cn(
        "shrink-0 rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/30 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-tight text-muted-foreground">Claim under study</p>
            {lastResearchedLabel ? (
              <p className="text-[10px] text-muted-foreground/80">Last run {lastResearchedLabel}</p>
            ) : null}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onRefreshBrief ? (
              <DropdownMenuItem disabled={briefLoading} onClick={onRefreshBrief}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh brief
              </DropdownMenuItem>
            ) : null}
            {onOpenSettings ? (
              <DropdownMenuItem onClick={onOpenSettings}>
                Research settings
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link to={`/framework/artifacts/${artifactId}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open artifact
              </Link>
            </DropdownMenuItem>
            {matchedBeliefId ? (
              <DropdownMenuItem asChild>
                <Link to={`/framework/beliefs/${matchedBeliefId}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Matched belief
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <blockquote
        className={cn(
          "mt-3 font-display text-[15px] leading-relaxed text-foreground sm:text-base",
          !expanded && long && "line-clamp-4",
        )}
      >
        {claimText}
      </blockquote>
      {long ? (
        <button
          type="button"
          className="mt-1.5 text-xs font-medium text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read full claim"}
        </button>
      ) : null}

      {onOpenReport ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 rounded-full px-3 text-xs shadow-sm"
            disabled={reportLoading}
            onClick={onOpenReport}
          >
            {reportLoading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            )}
            Full research report
          </Button>
        </div>
      ) : null}
    </header>
  );
}
