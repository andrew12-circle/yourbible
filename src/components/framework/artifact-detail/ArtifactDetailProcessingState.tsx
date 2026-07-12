import ArtifactPipelineBanner from "@/components/framework/artifact-detail/ArtifactPipelineBanner";
import ArtifactTranscriptFetchErrorCard from "@/components/framework/artifact-detail/ArtifactTranscriptFetchErrorCard";
import { isNonBlockingAnalysisError } from "@/lib/framework/artifactAnalysisRecovery";
import { artifactMobileStudyContentInset } from "@/lib/framework/artifactSurfaces";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";

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
