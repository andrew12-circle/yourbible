import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import ArtifactInsightRail from "@/components/framework/artifact-detail/ArtifactInsightRail";
import ArtifactLibraryStanding from "@/components/framework/artifact-detail/ArtifactLibraryStanding";
import ArtifactOverviewSummary from "@/components/framework/artifact-detail/ArtifactOverviewSummary";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import { artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import type { ArtifactFrameworkOverview } from "@/lib/framework/artifactOverviewSummary";
import type { CorpusPeerMatch } from "@/lib/framework/artifactCorpusStanding";
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
  frameworkOverview?: ArtifactFrameworkOverview | null;
  onNavigate: (hash: string) => void;
  onSelectClaim: (claimId: string) => void;
  claimSources?: Record<string, TranscriptSegment | null>;
  onSeeScripture?: (claimId: string) => void;
  onSeeInTranscript?: (claimId: string) => void;
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
  className?: string;
};

export default function ArtifactDesktopOverview({
  claims,
  artifactId,
  artifactStatus,
  claimsCount,
  entitiesCount,
  frameworkOverview,
  onNavigate,
  onSelectClaim,
  claimSources,
  onSeeScripture,
  onSeeInTranscript,
  corpusStanding,
  className,
}: Props) {
  return (
    <section
      id="overview"
      className={cn(artifactScrollMt, "space-y-10", className)}
      aria-label="Overview"
    >
      {frameworkOverview ? <ArtifactOverviewSummary overview={frameworkOverview} /> : null}

      {corpusStanding ? (
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
        />
      ) : null}

      {claimsCount > 0 ? (
        <div id="key-insights" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
          <ArtifactStudySectionHeader
            title="Key claims"
            count={claimsCount}
            countLabel={`${claimsCount} claims extracted`}
            description="Tap a card to open the full review — transcript, scripture, and verdicts."
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
