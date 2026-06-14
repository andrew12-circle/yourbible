import { RefreshCw } from "lucide-react";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import ArtifactInsightRail from "@/components/framework/artifact-detail/ArtifactInsightRail";
import ArtifactLibraryStanding from "@/components/framework/artifact-detail/ArtifactLibraryStanding";
import ArtifactOverviewSummary from "@/components/framework/artifact-detail/ArtifactOverviewSummary";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import { Button } from "@/components/ui/button";
import { artifactCard, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
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
  artifactMetadata?: import("@/pages/framework/artifacts/artifactLibraryModel").ArtifactMetadata | null;
  claimsCount: number;
  entitiesCount?: number;
  frameworkOverview?: ArtifactFrameworkOverview | null;
  onNavigate: (hash: string) => void;
  onSelectClaim: (claimId: string) => void;
  claimSources?: Record<string, TranscriptSegment | null>;
  onSeeScripture?: (claimId: string) => void;
  onSeeInTranscript?: (claimId: string) => void;
  isReadableDocument?: boolean;
  onReanalyze?: () => void;
  reanalyzeDisabled?: boolean;
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
  artifactMetadata,
  claimsCount,
  entitiesCount,
  frameworkOverview,
  onNavigate,
  onSelectClaim,
  claimSources,
  onSeeScripture,
  onSeeInTranscript,
  isReadableDocument = false,
  onReanalyze,
  reanalyzeDisabled = false,
  corpusStanding,
  className,
}: Props) {
  const seeInSourceLabel = isReadableDocument ? "See in reader" : "See in transcript";
  const claimsDescription = isReadableDocument
    ? "Tap a card to open the full review — reader, scripture, and verdicts."
    : "Tap a card to open the full review — transcript, scripture, and verdicts.";
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

      <div id="key-insights" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
        <ArtifactStudySectionHeader
          title="Key claims"
          count={claimsCount > 0 ? claimsCount : undefined}
          countLabel={claimsCount > 0 ? `${claimsCount} claims extracted` : undefined}
          description={claimsDescription}
          actionLabel={claimsCount > 0 ? "View all" : undefined}
          onAction={claimsCount > 0 ? () => onNavigate("#claims") : undefined}
        />
        {claimsCount > 0 ? (
          <ArtifactInsightRail
            claims={claims}
            claimSources={claimSources}
            onSelectClaim={onSelectClaim}
            onSeeInTranscript={onSeeInTranscript}
            onSeeScripture={onSeeScripture}
            seeInSourceLabel={seeInSourceLabel}
          />
        ) : (
          <div className={cn(artifactCard, "space-y-3 p-4 sm:p-5")}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isReadableDocument
                ? "The book text is in, but individual claims have not been extracted yet. Re-analyze to pull out teachings you can review, keep, or reject — same as video study."
                : "No claims extracted yet. Re-analyze to pull teachings from the transcript."}
            </p>
            {onReanalyze ? (
              <Button type="button" size="sm" variant="outline" disabled={reanalyzeDisabled} onClick={onReanalyze}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Re-analyze
              </Button>
            ) : null}
          </div>
        )}
      </div>

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
          artifactMetadata={artifactMetadata}
          variant="desktopRail"
        />
      </div>
    </section>
  );
}
