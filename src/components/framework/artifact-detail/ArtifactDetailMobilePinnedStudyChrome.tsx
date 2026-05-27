import { useMemo } from "react";
import ArtifactMobileInsightExploreSlot from "@/components/framework/artifact-detail/ArtifactMobileInsightExploreSlot";
import ArtifactMobilePinnedScrollChrome from "@/components/framework/artifact-detail/ArtifactMobilePinnedScrollChrome";
import ArtifactMobileSegmentedTabs from "@/components/framework/artifact-detail/ArtifactMobileSegmentedTabs";
import type { ArtifactMobileTab } from "@/hooks/useArtifactDetailMobileTabs";
import type {
  RenderClaimCardClaim,
  RenderClaimCardContext,
} from "@/components/framework/artifact-detail/renderArtifactDetailClaimCard";

type Props = {
  displayTitle: string;
  channel?: string | null;
  channelUrl?: string | null;
  providerName?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId: string;
  backTo?: string;
  canCaptureMoments: boolean;
  savingMoment: boolean;
  hasNote: boolean;
  transcriptTabActive: boolean;
  onBookmark: () => void;
  onSaveNote: () => void;
  onOpenNote: () => void;
  onOpenStudyMenu: () => void;
  mobilePinnedPane: boolean;
  mobileTab: ArtifactMobileTab;
  hasTranscriptText: boolean;
  onTabChange: (tab: ArtifactMobileTab) => void;
  mobileInsightExploreClaimId: string | null;
  claims: RenderClaimCardClaim[];
  claimCardContext: RenderClaimCardContext;
  onInsightExploreBack: () => void;
};

export default function ArtifactDetailMobilePinnedStudyChrome({
  mobilePinnedPane,
  mobileTab,
  hasTranscriptText,
  onTabChange,
  mobileInsightExploreClaimId,
  claims,
  claimCardContext,
  onInsightExploreBack,
  ...chromeProps
}: Props) {
  const mobileInsightExploreOpen =
    mobilePinnedPane && mobileTab === "study" && Boolean(mobileInsightExploreClaimId);

  const mobileTabBar = useMemo(
    () =>
      mobilePinnedPane ? (
        <ArtifactMobileSegmentedTabs
          value={mobileTab}
          onTabChange={onTabChange}
          hasTranscript={hasTranscriptText}
        />
      ) : null,
    [hasTranscriptText, mobilePinnedPane, mobileTab, onTabChange],
  );

  const mobileInsightExplorePanel = useMemo(
    () => (
      <ArtifactMobileInsightExploreSlot
        enabled={mobileInsightExploreOpen}
        claimId={mobileInsightExploreClaimId}
        claims={claims}
        claimCardContext={claimCardContext}
        onBack={onInsightExploreBack}
      />
    ),
    [
      claimCardContext,
      claims,
      mobileInsightExploreClaimId,
      mobileInsightExploreOpen,
      onInsightExploreBack,
    ],
  );

  return (
    <ArtifactMobilePinnedScrollChrome
      {...chromeProps}
      mobileTabBar={mobileTabBar}
      insightExploreOpen={mobileInsightExploreOpen}
      insightExplorePanel={mobileInsightExplorePanel}
    />
  );
}
