import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, Loader2, MoreHorizontal, RefreshCw } from "lucide-react";
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
  const long = claimText.length > 200 || claimText.includes("\n");

  return (
    <header className={cn("border-b border-border/40 pb-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">
          {lastResearchedLabel ? `Last researched ${lastResearchedLabel}` : "Researching this claim"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground"
            >
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
              <DropdownMenuItem onClick={onOpenSettings}>Research settings</DropdownMenuItem>
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
          "mt-2 text-[11px] font-normal leading-snug text-foreground",
          !expanded && long && "line-clamp-3",
        )}
      >
        {claimText}
      </blockquote>
      {long ? (
        <button
          type="button"
          className="mt-2 text-[10px] text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}

      {onOpenReport ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-4 h-6 gap-1 rounded-full px-2.5 text-[10px] text-muted-foreground hover:text-foreground"
          disabled={reportLoading}
          onClick={onOpenReport}
        >
          {reportLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
          Full research report
        </Button>
      ) : null}
    </header>
  );
}
