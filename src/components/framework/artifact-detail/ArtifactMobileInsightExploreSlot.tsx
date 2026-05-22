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
};

export default function ArtifactMobileInsightExploreSlot({
  enabled,
  claimId,
  claims,
  claimCardContext,
  onBack,
}: Props) {
  if (!enabled || !claimId) return null;
  const idx = claims.findIndex((c) => c.id === claimId);
  const claim = claims[idx];
  if (!claim) return null;
  return (
    <ArtifactMobileInsightExplorePanel
      claim={claim}
      claimIndex={idx}
      claimCardContext={claimCardContext}
      onBack={onBack}
    />
  );
}
