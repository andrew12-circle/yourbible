import { useState } from "react";
import ArtifactMobileInsightHeroRail from "@/components/framework/artifact-detail/ArtifactMobileInsightHeroRail";
import ArtifactOverviewSummary from "@/components/framework/artifact-detail/ArtifactOverviewSummary";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
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
  claimsCount: number;
  entitiesCount?: number;
  frameworkOverview?: ArtifactFrameworkOverview | null;
  onNavigate: (hash: string) => void;
  onSelectClaim: (claimId: string) => void;
  activeClaimId?: string | null;
  claimSources?: Record<string, TranscriptSegment | null>;
  onSeeScripture?: (claimId: string) => void;
  className?: string;
};

export default function ArtifactMobileOverview({
  claims,
  artifactId,
  artifactStatus,
  claimsCount,
  entitiesCount,
  frameworkOverview,
  onNavigate: _onNavigate,
  onSelectClaim,
  activeClaimId,
  onSeeScripture,
  className,
}: Props) {
  const [entitiesExpanded, setEntitiesExpanded] = useState(false);

  return (
    <section
      id="overview"
      className={cn("space-y-10 md:space-y-12", className)}
      aria-label="Study overview"
    >
      {frameworkOverview ? (
        <ArtifactOverviewSummary overview={frameworkOverview} headerClassName={artifactMobileStudyContentInset} />
      ) : null}

      {claimsCount > 0 ? (
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
            variant={entitiesExpanded ? "default" : "mobileRail"}
          />
        </div>
      </div>
    </section>
  );
}
