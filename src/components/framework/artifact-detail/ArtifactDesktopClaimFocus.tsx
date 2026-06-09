import ArtifactMobileInsightExplorePanel from "@/components/framework/artifact-detail/ArtifactMobileInsightExplorePanel";
import type {
  RenderClaimCardClaim,
  RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";
import { artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  claimId: string;
  claims: RenderClaimCardClaim[];
  claimCardContext: RenderClaimCardContext;
  onBack: () => void;
  onSelectClaim?: (claimId: string) => void;
  className?: string;
};

/** Desktop study column: full claim review inline below the hero video (replaces overview rail). */
export default function ArtifactDesktopClaimFocus({
  claimId,
  claims,
  claimCardContext,
  onBack,
  onSelectClaim,
  className,
}: Props) {
  const claimIndex = claims.findIndex((c) => c.id === claimId);
  const claim = claimIndex >= 0 ? claims[claimIndex] : null;
  const nextClaim = claimIndex >= 0 && claimIndex < claims.length - 1 ? claims[claimIndex + 1] : null;
  if (!claim) return null;

  return (
    <section
      id="overview"
      className={cn(artifactScrollMt, "scroll-mt-28", className)}
      aria-label={`Claim ${claimIndex + 1} review`}
    >
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-background shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <ArtifactMobileInsightExplorePanel
          claim={claim}
          claimIndex={claimIndex}
          claimCardContext={{ ...claimCardContext, isDesktop: true }}
          onBack={onBack}
          backLabel="Back to overview"
          backAriaLabel="Back to overview"
          onNext={nextClaim && onSelectClaim ? () => onSelectClaim(nextClaim.id) : undefined}
          nextClaimNumber={nextClaim ? claimIndex + 2 : undefined}
          className="max-h-[min(calc(100dvh-16rem),720px)]"
        />
      </div>
    </section>
  );
}
