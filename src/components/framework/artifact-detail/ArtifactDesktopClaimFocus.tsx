import ArtifactMobileInsightExplorePanel from "@/components/framework/artifact-detail/ArtifactMobileInsightExplorePanel";
import type {
  RenderClaimCardClaim,
  RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
import { artifactPremiumCard, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  claimId: string;
  claims: RenderClaimCardClaim[];
  claimCardContext: RenderClaimCardContext;
  onBack: () => void;
  className?: string;
};

/** Desktop study column: full claim review inline below the hero video (replaces overview rail). */
export default function ArtifactDesktopClaimFocus({
  claimId,
  claims,
  claimCardContext,
  onBack,
  className,
}: Props) {
  const claimIndex = claims.findIndex((c) => c.id === claimId);
  const claim = claimIndex >= 0 ? claims[claimIndex] : null;
  if (!claim) return null;

  return (
    <section
      id="overview"
      className={cn(artifactScrollMt, "scroll-mt-28", className)}
      aria-label={`Claim ${claimIndex + 1} review`}
    >
      <div
        className={cn(
          artifactPremiumCard,
          "overflow-hidden border-border/50 bg-card/95 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]",
        )}
      >
        <ArtifactMobileInsightExplorePanel
          claim={claim}
          claimIndex={claimIndex}
          claimCardContext={{ ...claimCardContext, isDesktop: true }}
          onBack={onBack}
          backLabel="Back to overview"
          backAriaLabel="Back to overview"
          className="max-h-[min(calc(100dvh-16rem),720px)]"
        />
      </div>
    </section>
  );
}
