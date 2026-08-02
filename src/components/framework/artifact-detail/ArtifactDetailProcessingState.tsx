import { FileText, RefreshCw } from "lucide-react";
import ArtifactPipelineBanner from "@/components/framework/artifact-detail/ArtifactPipelineBanner";
import ArtifactTranscriptFetchErrorCard from "@/components/framework/artifact-detail/ArtifactTranscriptFetchErrorCard";
import { Button } from "@/components/ui/button";
import { isNonBlockingAnalysisError } from "@/lib/framework/artifactAnalysisRecovery";
import { artifactMobileStudyContentInset } from "@/lib/framework/artifactSurfaces";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { cn } from "@/lib/utils";

type Props = {
  artifact: ArtifactRow;
  inFlight: boolean;
  elapsed: number;
  stageLabel: Record<string, string>;
  stageHint: Record<string, string>;
  studyClaimsCount: number;
  mobilePinnedPane: boolean;
  retryingFetch: boolean;
  onPasteTranscript: () => void;
  onReanalyze: () => void;
  onRetryFetch: () => void;
};

export default function ArtifactDetailProcessingState({
  artifact,
  inFlight,
  elapsed,
  stageLabel,
  stageHint,
  studyClaimsCount,
  mobilePinnedPane,
  retryingFetch,
  onPasteTranscript,
  onReanalyze,
  onRetryFetch,
}: Props) {
  const hasStudyOutput = Boolean(artifact.raw_text?.trim() || studyClaimsCount > 0);
  const showTranscriptRecovery =
    artifact.kind === "youtube" &&
    Boolean(artifact.url?.trim()) &&
    !inFlight &&
    artifact.status !== "error" &&
    !hasStudyOutput;

  return (
    <>
      {inFlight ? (
        <ArtifactPipelineBanner
          status={artifact.status}
          kind={artifact.kind}
          elapsed={elapsed}
          label={stageLabel[artifact.status] ?? "Working…"}
          hint={stageHint[artifact.status] ?? ""}
          onPasteTranscript={onPasteTranscript}
          onRetryAnalyze={
            artifact.status === "analyzing" && artifact.raw_text?.trim() ? onReanalyze : undefined
          }
        />
      ) : null}

      {showTranscriptRecovery ? (
        <section
          className={cn(
            "mb-5 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm shadow-sm",
            mobilePinnedPane && artifactMobileStudyContentInset,
          )}
          data-testid="artifact-transcript-recovery"
          role="status"
        >
          <p className="font-medium text-foreground">Transcript hasn&apos;t arrived yet</p>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">
            The video was saved, but it has no transcript or insight cards yet. Try the fetch again, or paste
            the transcript to keep studying now.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={retryingFetch} onClick={onRetryFetch}>
              <RefreshCw className={cn("mr-1 h-3.5 w-3.5", retryingFetch && "animate-spin")} aria-hidden />
              {retryingFetch ? "Fetching..." : "Try fetch again"}
            </Button>
            <Button size="sm" variant="outline" onClick={onPasteTranscript}>
              <FileText className="mr-1 h-3.5 w-3.5" aria-hidden />
              Paste transcript
            </Button>
          </div>
        </section>
      ) : null}

      {artifact.error && artifact.status === "error" ? (
        <ArtifactTranscriptFetchErrorCard
          error={artifact.error}
          variant={
            isNonBlockingAnalysisError({
              error: artifact.error,
              rawText: artifact.raw_text,
              claimsCount: studyClaimsCount,
            })
              ? "warning"
              : "destructive"
          }
          retryingFetch={retryingFetch}
          inFlight={inFlight}
          showRetry={artifact.kind === "youtube" && Boolean(artifact.url) && !artifact.raw_text?.trim()}
          showReanalyze={Boolean(artifact.raw_text?.trim())}
          onRetry={onRetryFetch}
          onPaste={onPasteTranscript}
          onReanalyze={onReanalyze}
          className={mobilePinnedPane ? artifactMobileStudyContentInset : undefined}
        />
      ) : null}
    </>
  );
}
