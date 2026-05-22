import ArtifactInsightCarousel from "@/components/framework/artifact-detail/ArtifactInsightCarousel";

type ClaimLike = {
  id: string;
  claim: string;
  verdict: string | null;
};

type Props<T extends ClaimLike> = {
  claims: T[];
  activeClaimId?: string | null;
  onSelectClaim: (claimId: string) => void;
  className?: string;
};

/** @deprecated Use ArtifactInsightCarousel with variant="mobile". */
export default function ArtifactMobileInsightCarousel<T extends ClaimLike>(props: Props<T>) {
  return <ArtifactInsightCarousel {...props} variant="mobile" />;
}
