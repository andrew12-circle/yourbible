import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArtifactClaimActionBar from "@/components/framework/artifact-detail/ArtifactClaimActionBar";
import {
  renderArtifactDetailClaimCard,
  type RenderClaimCardClaim,
  type RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
import { artifactMobileDockPadding } from "@/lib/framework/artifactSurfaces";
import {
  artifactInsightExploreHeader,
  artifactInsightExploreScroll,
  artifactInsightExploreShell,
} from "@/lib/framework/artifactStudyTheme";
import { cn } from "@/lib/utils";

type Props = {
  claim: RenderClaimCardClaim;
  claimIndex: number;
  claimCardContext: RenderClaimCardContext;
  onBack: () => void;
  backLabel?: string;
  backAriaLabel?: string;
  onNext?: () => void;
  nextClaimNumber?: number;
  className?: string;
};

export default function ArtifactMobileInsightExplorePanel({
  claim,
  claimIndex,
  claimCardContext,
  onBack,
  backLabel = "Back",
  backAriaLabel = "Back to study",
  onNext,
  nextClaimNumber,
  className,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = claimCardContext.isDesktop;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (typeof el.scrollTo === "function") el.scrollTo({ top: 0 });
    else el.scrollTop = 0;
  }, [claim.id]);

  const detailContext: RenderClaimCardContext = {
    ...claimCardContext,
    layout: "insightExplore",
    activeClaimId: claim.id,
    actionsPlacement: "external",
  };
  const card = renderArtifactDetailClaimCard(claim, claimIndex, detailContext);
  const actionBar = (
    <ArtifactClaimActionBar
      claim={claim}
      context={detailContext}
      placement={isDesktop ? "top" : "bottom"}
      floating={!isDesktop}
    />
  );

  return (
    <section
      className={cn(artifactInsightExploreShell, "relative", className)}
      aria-label={`Insight ${claimIndex + 1}`}
    >
      <div className={artifactInsightExploreHeader}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2 text-sm font-medium text-foreground"
          onClick={onBack}
          aria-label={backAriaLabel}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {backLabel}
        </Button>
        {onNext && nextClaimNumber ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-2 text-sm font-medium text-foreground"
            onClick={onNext}
            aria-label={`Go to claim ${nextClaimNumber}`}
          >
            Next
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        ) : null}
      </div>
      {isDesktop ? actionBar : null}
      <div
        ref={scrollRef}
        className={cn(artifactInsightExploreScroll, !isDesktop && artifactMobileDockPadding)}
      >
        {card}
      </div>
      {!isDesktop ? actionBar : null}
    </section>
  );
}
