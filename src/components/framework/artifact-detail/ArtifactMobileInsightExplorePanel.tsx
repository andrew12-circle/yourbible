import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  className?: string;
};

export default function ArtifactMobileInsightExplorePanel({
  claim,
  claimIndex,
  claimCardContext,
  onBack,
  className,
}: Props) {
  const accent = artifactMobileInsightHeroAccent(claimIndex);
  const card = renderArtifactDetailClaimCard(claim, claimIndex, {
    ...claimCardContext,
    layout: "stack",
    activeClaimId: claim.id,
  });

  return (
    <section
      className={cn("border-b border-border/60 bg-background", className)}
      aria-label={`Insight ${claimIndex + 1}`}
    >
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs font-medium text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to insights
        </Button>
        <span className={cn("ml-auto font-display text-lg font-semibold tabular-nums", accent.number)}>
          {claimIndex + 1}
        </span>
      </div>
      <div
        className={cn(
          "max-h-[min(58vh,560px)] overflow-y-auto overscroll-contain px-3 py-3 scrollbar-thin",
        )}
      >
        {card}
      </div>
    </section>
  );
}
