import { principalFindings, type ArtifactFindingEvidence } from "@/lib/framework/artifactFindingEvidence";
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

type ClaimLike = ArtifactFindingEvidence & { id: string; claim: string; verdict: string | null; scripture_supports?: { ref: string; note?: string }[] };
type Props = {
  claims: ClaimLike[]; artifactId: string; artifactStatus: string;
  artifactMetadata?: import("@/pages/framework/artifacts/artifactLibraryModel").ArtifactMetadata | null;
  claimsCount: number; entitiesCount?: number; frameworkOverview?: ArtifactFrameworkOverview | null;
  onNavigate: (hash: string) => void; onSelectClaim: (claimId: string) => void; activeClaimId?: string | null;
  claimSources?: Record<string, TranscriptSegment | null>; onSeeScripture?: (claimId: string) => void;
  corpusStanding?: { agreeCount: number; disagreeCount: number; newCount: number; peerLibraryCount: number;
    peers: CorpusPeerMatch[]; echoClaimCount: number; loading: boolean; error: string | null; embeddingPending?: boolean; onReload?: () => void };
  pinnedVideoPane?: boolean; className?: string; hideKeyInsightsRail?: boolean;
};
export default function ArtifactMobileOverview({ claims, artifactId, artifactStatus, artifactMetadata, claimsCount, entitiesCount,
  frameworkOverview, onSelectClaim, activeClaimId, onSeeScripture, corpusStanding,
  pinnedVideoPane = false, hideKeyInsightsRail = false, className }: Props) {
  const [entitiesExpanded, setEntitiesExpanded] = useState(false);
  const principals = principalFindings(claims);
  return (
    <section id="overview" className={cn("space-y-10 md:space-y-12", className)} aria-label="Study overview">
      {claimsCount > 0 && !hideKeyInsightsRail ? (
        <div id="key-insights" className="scroll-mt-4 space-y-4 md:space-y-5">
          <ArtifactStudySectionHeader title="Principal findings" count={principals.length}
            countLabel={`${principals.length} shown · ${claimsCount} total findings`} className={artifactMobileStudyContentInset} />
          <ArtifactMobileInsightHeroRail claims={principals} activeClaimId={activeClaimId} onSelectClaim={onSelectClaim} onSeeScripture={onSeeScripture} />
        </div>
      ) : null}
      {frameworkOverview ? <ArtifactOverviewSummary overview={frameworkOverview} headerClassName={artifactMobileStudyContentInset} /> : null}
      {corpusStanding ? (
        <ArtifactCollapsibleSection id="library-standing" title="In your library"
          description="How this source compares to other saved sources and to your beliefs."
          defaultOpenMobile={false} defaultOpenDesktop pinnedVideoPane={pinnedVideoPane}
          storageKey={artifactId ? `artifact-library-standing:${artifactId}` : undefined}>
          <ArtifactLibraryStanding artifactId={artifactId} claimsCount={claimsCount} {...corpusStanding} hideHeader />
        </ArtifactCollapsibleSection>
      ) : null}
      <div id="people-themes" className="scroll-mt-4 space-y-4 md:space-y-5">
        <ArtifactStudySectionHeader title="People & themes" count={entitiesCount}
          countLabel={entitiesCount != null ? `${entitiesCount} mentioned` : undefined}
          actionLabel={entitiesExpanded ? undefined : "Explore all"} onAction={entitiesExpanded ? undefined : () => setEntitiesExpanded(true)}
          className={artifactMobileStudyContentInset} />
        <div className={entitiesExpanded ? artifactMobileStudyContentInset : undefined}>
          <ArtifactEntitiesPanel artifactId={artifactId} artifactStatus={artifactStatus} artifactMetadata={artifactMetadata}
            variant={entitiesExpanded ? "default" : "mobileRail"} />
        </div>
      </div>
    </section>
  );
}
