import { principalFindings, type ArtifactFindingEvidence } from "@/lib/framework/artifactFindingEvidence";
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

type ClaimLike = ArtifactFindingEvidence & { id: string; claim: string; verdict: string | null; scripture_supports?: { ref: string; note?: string }[] };
type Props = {
  claims: ClaimLike[]; artifactId: string; artifactStatus: string;
  artifactMetadata?: import("@/pages/framework/artifacts/artifactLibraryModel").ArtifactMetadata | null;
  claimsCount: number; entitiesCount?: number; frameworkOverview?: ArtifactFrameworkOverview | null;
  onNavigate: (hash: string) => void; onSelectClaim: (claimId: string) => void;
  claimSources?: Record<string, TranscriptSegment | null>; onSeeScripture?: (claimId: string) => void;
  onSeeInTranscript?: (claimId: string) => void; isReadableDocument?: boolean; onReanalyze?: () => void; reanalyzeDisabled?: boolean;
  corpusStanding?: { agreeCount: number; disagreeCount: number; newCount: number; peerLibraryCount: number;
    peers: CorpusPeerMatch[]; echoClaimCount: number; loading: boolean; error: string | null; embeddingPending?: boolean; onReload?: () => void };
  className?: string;
};
export default function ArtifactDesktopOverview({ claims, artifactId, artifactStatus, artifactMetadata, claimsCount, entitiesCount,
  frameworkOverview, onNavigate, onSelectClaim, claimSources, onSeeScripture, onSeeInTranscript,
  isReadableDocument = false, onReanalyze, reanalyzeDisabled = false, corpusStanding, className }: Props) {
  const principals = principalFindings(claims);
  const hasRankedFindings = claims.some(claim => claim.is_primary);
  const seeInSourceLabel = isReadableDocument ? "See in reader" : "See in transcript";
  return (
    <section id="overview" className={cn(artifactScrollMt, "space-y-10", className)} aria-label="Overview">
      {frameworkOverview ? <ArtifactOverviewSummary overview={frameworkOverview} /> : null}
      {corpusStanding ? <ArtifactLibraryStanding artifactId={artifactId} claimsCount={claimsCount} {...corpusStanding} /> : null}
      <div id="key-insights" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
        <ArtifactStudySectionHeader title={hasRankedFindings ? "Principal findings" : "Key claims"} count={principals.length || undefined}
          countLabel={claimsCount > 0 ? `${principals.length} shown · ${claimsCount} total findings` : undefined}
          description="Open a finding to inspect its source, research it, and record your own conclusion."
          actionLabel={claimsCount > 0 ? "View all" : undefined} onAction={claimsCount > 0 ? () => onNavigate("#claims") : undefined} />
        {claimsCount > 0 ? <ArtifactInsightRail claims={principals} claimSources={claimSources} onSelectClaim={onSelectClaim}
          onSeeInTranscript={onSeeInTranscript} onSeeScripture={onSeeScripture} seeInSourceLabel={seeInSourceLabel} /> : (
          <div className={cn(artifactCard, "space-y-3 p-4 sm:p-5")}>
            <p className="text-sm leading-relaxed text-muted-foreground">No published findings are available. The analysis status above shows whether extraction is incomplete or completed without substantive findings.</p>
            {onReanalyze ? <Button type="button" size="sm" variant="outline" disabled={reanalyzeDisabled} onClick={onReanalyze}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />Re-analyze</Button> : null}
          </div>
        )}
      </div>
      <div id="people-themes" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
        <ArtifactStudySectionHeader title="People & themes" count={entitiesCount}
          countLabel={entitiesCount != null ? `${entitiesCount} mentioned` : undefined}
          actionLabel="Full index" onAction={() => onNavigate("#entities")} />
        <ArtifactEntitiesPanel artifactId={artifactId} artifactStatus={artifactStatus} artifactMetadata={artifactMetadata} variant="desktopRail" />
      </div>
    </section>
  );
}
