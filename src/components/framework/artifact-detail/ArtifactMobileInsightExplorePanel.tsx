import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArtifactClaimActionBar from "@/components/framework/artifact-detail/ArtifactClaimActionBar";
import {
  renderArtifactDetailClaimCard,
  type RenderClaimCardClaim,
  type RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
import { artifactMobileInsightHeroAccent } from "@/lib/framework/artifactStudyTheme";
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
  const accent = artifactMobileInsightHeroAccent(claimIndex);
  const isDesktop = claimCardContext.isDesktop;
  const detailContext: RenderClaimCardContext = {
    ...claimCardContext,
    layout: "stack",
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
      className={cn("flex h-full min-h-0 flex-col bg-background", className)}
      aria-label={`Insight ${claimIndex + 1}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 px-3 py-2.5">
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
        <span className={cn("shrink-0 font-display text-xl font-semibold tabular-nums", accent.number)}>
          {claimIndex + 1}
        </span>
      </div>
      {isDesktop ? actionBar : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-thin">
        {card}
      </div>
      {!isDesktop ? actionBar : null}
    </section>
  );
}
