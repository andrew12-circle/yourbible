import { useState } from "react";
import ArtifactCollapsibleSection from "@/components/framework/artifact-detail/ArtifactCollapsibleSection";
import ArtifactMobileInsightHeroRail from "@/components/framework/artifact-detail/ArtifactMobileInsightHeroRail";
import ArtifactLibraryStanding from "@/components/framework/artifact-detail/ArtifactLibraryStanding";
import ArtifactOverviewSummary from "@/components/framework/artifact-detail/ArtifactOverviewSummary";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import type { CorpusPeerMatch } from "@/lib/framework/artifactCorpusStanding";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { artifactMobileStudyContentInset } from "@/lib/framework/artifactSurfaces";
import type { ArtifactFrameworkOverview } from "@/lib/framework/artifactOverviewSummary";
import { cn } from "@/lib/utils";

type ClaimLike = {
  id: string;
  claim: string;
  verdict: string | null;
  scripture_supports?: { ref: string; note?: string }[];
};

type Props = {
  claims: ClaimLike[];
  artifactId: string;
  artifactStatus: string;
  artifactMetadata?: import("@/pages/framework/artifacts/artifactLibraryModel").ArtifactMetadata | null;
  claimsCount: number;
  entitiesCount?: number;
  frameworkOverview?: ArtifactFrameworkOverview | null;
  onNavigate: (hash: string) => void;
  onSelectClaim: (claimId: string) => void;
  activeClaimId?: string | null;
  claimSources?: Record<string, TranscriptSegment | null>;
  onSeeScripture?: (claimId: string) => void;
  corpusStanding?: {
    agreeCount: number;
    disagreeCount: number;
    newCount: number;
    peerLibraryCount: number;
    peers: CorpusPeerMatch[];
    echoClaimCount: number;
    loading: boolean;
    error: string | null;
    embeddingPending?: boolean;
    onReload?: () => void;
  };
  pinnedVideoPane?: boolean;
  className?: string;
  /** Parent renders a swipeable claims rail — skip duplicate hero carousel. */
  hideKeyInsightsRail?: boolean;
};

export default function ArtifactMobileOverview({
  claims,
  artifactId,
  artifactStatus,
  artifactMetadata,
  claimsCount,
  entitiesCount,
  frameworkOverview,
  onNavigate: _onNavigate,
  onSelectClaim,
  activeClaimId,
  onSeeScripture,
  corpusStanding,
  pinnedVideoPane = false,
  hideKeyInsightsRail = false,
  className,
}: Props) {
  const [entitiesExpanded, setEntitiesExpanded] = useState(false);

  return (
    <section
      id="overview"
      className={cn("space-y-10 md:space-y-12", className)}
      aria-label="Study overview"
    >
      {claimsCount > 0 && !hideKeyInsightsRail ? (
        <div id="key-insights" className="scroll-mt-4 space-y-4 md:space-y-5">
          <ArtifactStudySectionHeader
            title="Key insights"
            count={claimsCount}
            countLabel={`${claimsCount} insights`}
            className={artifactMobileStudyContentInset}
          />
          <ArtifactMobileInsightHeroRail
            claims={claims}
            activeClaimId={activeClaimId}
            onSelectClaim={onSelectClaim}
            onSeeScripture={onSeeScripture}
          />
        </div>
      ) : null}

      {frameworkOverview ? (
        <ArtifactOverviewSummary overview={frameworkOverview} headerClassName={artifactMobileStudyContentInset} />
      ) : null}

      {corpusStanding ? (
        <ArtifactCollapsibleSection
          id="library-standing"
          title="In your library"
          description="How this source compares to everything else you've fed in — and to your beliefs."
          defaultOpenMobile={false}
          defaultOpenDesktop
          pinnedVideoPane={pinnedVideoPane}
          storageKey={artifactId ? `artifact-library-standing:${artifactId}` : undefined}
        >
          <ArtifactLibraryStanding
            artifactId={artifactId}
            claimsCount={claimsCount}
            agreeCount={corpusStanding.agreeCount}
            disagreeCount={corpusStanding.disagreeCount}
            newCount={corpusStanding.newCount}
            peerLibraryCount={corpusStanding.peerLibraryCount}
            peers={corpusStanding.peers}
            echoClaimCount={corpusStanding.echoClaimCount}
            loading={corpusStanding.loading}
            error={corpusStanding.error}
            embeddingPending={corpusStanding.embeddingPending}
            onReload={corpusStanding.onReload}
            hideHeader
          />
        </ArtifactCollapsibleSection>
      ) : null}

      <div id="people-themes" className="scroll-mt-4 space-y-4 md:space-y-5">
        <ArtifactStudySectionHeader
          title="People & themes"
          count={entitiesCount}
          countLabel={entitiesCount != null ? `${entitiesCount} mentioned` : undefined}
          actionLabel={entitiesExpanded ? undefined : "Explore all"}
          onAction={entitiesExpanded ? undefined : () => setEntitiesExpanded(true)}
          className={artifactMobileStudyContentInset}
        />
        <div className={entitiesExpanded ? artifactMobileStudyContentInset : undefined}>
          <ArtifactEntitiesPanel
            artifactId={artifactId}
            artifactStatus={artifactStatus}
            artifactMetadata={artifactMetadata}
            variant={entitiesExpanded ? "default" : "mobileRail"}
          />
        </div>
      </div>
    </section>
  );
}
