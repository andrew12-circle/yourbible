import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import ArtifactInsightRail from "@/components/framework/artifact-detail/ArtifactInsightRail";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import { artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
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
  onNavigate: (hash: string) => void;
  onSelectClaim: (claimId: string) => void;
  claimSources?: Record<string, TranscriptSegment | null>;
  onSeeScripture?: (claimId: string) => void;
  onSeeInTranscript?: (claimId: string) => void;
  className?: string;
};

export default function ArtifactDesktopOverview({
  claims,
  artifactId,
  artifactStatus,
  claimsCount,
  entitiesCount,
  onNavigate,
  onSelectClaim,
  claimSources,
  onSeeScripture,
  onSeeInTranscript,
  className,
}: Props) {
  return (
    <section
      id="overview"
      className={cn(artifactScrollMt, "space-y-10", className)}
      aria-label="Overview"
    >
      {claimsCount > 0 ? (
        <div id="key-insights" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
          <ArtifactStudySectionHeader
            title="Key claims"
            count={claimsCount}
            countLabel={`${claimsCount} claims extracted`}
            actionLabel="View all"
            onAction={() => onNavigate("#claims")}
          />
          <ArtifactInsightRail
            claims={claims}
            claimSources={claimSources}
            onSelectClaim={onSelectClaim}
            onSeeInTranscript={onSeeInTranscript}
            onSeeScripture={onSeeScripture}
          />
        </div>
      ) : null}

      <div id="people-themes" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
        <ArtifactStudySectionHeader
          title="People & themes"
          count={entitiesCount}
          countLabel={entitiesCount != null ? `${entitiesCount} mentioned` : undefined}
          actionLabel="Full index"
          onAction={() => onNavigate("#entities")}
        />
        <ArtifactEntitiesPanel
          artifactId={artifactId}
          artifactStatus={artifactStatus}
          variant="desktopRail"
        />
      </div>
    </section>
  );
}
