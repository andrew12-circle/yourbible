import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  renderArtifactDetailClaimActions,
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
  const detailContext: RenderClaimCardContext = {
    ...claimCardContext,
    layout: "stack",
    activeClaimId: claim.id,
    actionsPlacement: "external",
  };
  const actions = renderArtifactDetailClaimActions(claim, detailContext, {
    bordered: false,
    wrap: false,
    showSeparator: false,
    className:
      "min-w-0 flex-1 justify-end overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  });
  const card = renderArtifactDetailClaimCard(claim, claimIndex, detailContext);

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col bg-background", className)}
      aria-label={`Insight ${claimIndex + 1}`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2 text-xs font-medium text-foreground"
          onClick={onBack}
          aria-label={backAriaLabel}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {backLabel}
        </Button>
        {actions}
        <span className={cn("shrink-0 font-display text-lg font-semibold tabular-nums", accent.number)}>
          {claimIndex + 1}
        </span>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-safe scrollbar-thin",
        )}
      >
        {card}
      </div>
    </section>
  );
}
