import ArtifactMobileInsightExplorePanel from "@/components/framework/artifact-detail/ArtifactMobileInsightExplorePanel";
import type {
  RenderClaimCardClaim,
  RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";

type Props = {
  enabled: boolean;
  claimId: string | null;
  claims: RenderClaimCardClaim[];
  claimCardContext: RenderClaimCardContext;
  onBack: () => void;
  onSelectClaim?: (claimId: string) => void;
  backLabel?: string;
  backAriaLabel?: string;
  panelClassName?: string;
};

export default function ArtifactMobileInsightExploreSlot({
  enabled,
  claimId,
  claims,
  claimCardContext,
  onBack,
  onSelectClaim,
  backLabel,
  backAriaLabel,
  panelClassName,
}: Props) {
  if (!enabled || !claimId) return null;
  const idx = claims.findIndex((c) => c.id === claimId);
  const claim = claims[idx];
  const nextClaim = idx >= 0 && idx < claims.length - 1 ? claims[idx + 1] : null;
  if (!claim) return null;
  return (
    <ArtifactMobileInsightExplorePanel
      claim={claim}
      claimIndex={idx}
      claimCardContext={claimCardContext}
      onBack={onBack}
      backLabel={backLabel}
      backAriaLabel={backAriaLabel}
      onNext={nextClaim && onSelectClaim ? () => onSelectClaim(nextClaim.id) : undefined}
      nextClaimNumber={nextClaim ? idx + 2 : undefined}
      className={panelClassName}
    />
  );
}
