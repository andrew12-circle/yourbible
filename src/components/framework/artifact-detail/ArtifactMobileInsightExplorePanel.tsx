import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArtifactClaimActionBar from "@/components/framework/artifact-detail/ArtifactClaimActionBar";
import {
  renderArtifactDetailClaimCard,
  type RenderClaimCardClaim,
  type RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
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
  className?: string;
};

export default function ArtifactMobileInsightExplorePanel({
  claim,
  claimIndex,
  claimCardContext,
  onBack,
  backLabel = "Back",
  backAriaLabel = "Back to study",
  className,
}: Props) {
  const isDesktop = claimCardContext.isDesktop;
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
    />
  );

  return (
    <section
      className={cn(artifactInsightExploreShell, className)}
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
      </div>
      {isDesktop ? actionBar : null}
      <div className={artifactInsightExploreScroll}>{card}</div>
      {!isDesktop ? actionBar : null}
    </section>
  );
}
