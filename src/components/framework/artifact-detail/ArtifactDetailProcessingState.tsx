import { FileText, RefreshCw } from "lucide-react";
import ArtifactPipelineBanner from "@/components/framework/artifact-detail/ArtifactPipelineBanner";
import ArtifactTranscriptFetchErrorCard from "@/components/framework/artifact-detail/ArtifactTranscriptFetchErrorCard";
import ArtifactFindingsOverview from "@/components/framework/artifact-detail/ArtifactFindingsOverview";
import { Button } from "@/components/ui/button";
import { isNonBlockingAnalysisError } from "@/lib/framework/artifactAnalysisRecovery";
import { artifactMobileStudyContentInset } from "@/lib/framework/artifactSurfaces";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { cn } from "@/lib/utils";

type Props = {
  artifact: ArtifactRow; inFlight: boolean; elapsed: number; stageLabel: Record<string, string>;
  stageHint: Record<string, string>; studyClaimsCount: number; mobilePinnedPane: boolean; retryingFetch: boolean;
  onPasteTranscript: () => void; onReanalyze: () => void; onRetryFetch: () => void;
};
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export default function ArtifactDetailProcessingState({
  artifact, inFlight, elapsed, stageLabel, stageHint, studyClaimsCount, mobilePinnedPane,
  retryingFetch, onPasteTranscript, onReanalyze, onRetryFetch,
}: Props) {
  const hasStudyOutput = Boolean(artifact.raw_text?.trim() || studyClaimsCount > 0);
  const transcriptStalled = inFlight && !hasStudyOutput && elapsed >= 140;
  const analysis = record(record(artifact.metadata).analysis);
  const versioned = typeof analysis.run_id === "string";
  const complete = analysis.status === "complete";
  const stopped = analysis.status === "partial" || analysis.status === "failed";
  const total = typeof analysis.total_batches === "number" ? Math.max(0, analysis.total_batches) : 0;
  const done = typeof analysis.completed_batches === "number" ? Math.min(total, Math.max(0, analysis.completed_batches)) : 0;
  const showTranscriptRecovery = artifact.kind === "youtube" && Boolean(artifact.url?.trim()) &&
    (!inFlight || transcriptStalled) && artifact.status !== "error" && !hasStudyOutput;

  return <>
    {versioned ? <section className={cn("mb-4 rounded-xl border border-border bg-card p-4 text-sm", mobilePinnedPane && artifactMobileStudyContentInset)} data-testid="artifact-analysis-coverage">
      <p className="font-medium">{complete ? "Analysis complete" : stopped ? "Analysis incomplete" : done === total && total > 0 ? "Organizing principal findings" : "Analyzing the saved transcript"}</p>
      <p className="mt-1 text-muted-foreground">{done} of {total} transcript sections processed. {complete ? "All planned sections finished before publication." : "Existing findings, verdicts, and notes remain available."}</p>
      {!complete && total > 0 ? <progress className="mt-3 h-2 w-full" value={done} max={total} aria-label="Transcript sections processed" /> : null}
      {typeof analysis.message === "string" && analysis.message ? <p className="mt-2 text-muted-foreground">{analysis.message}</p> : null}
      {stopped ? <Button className="mt-3" size="sm" variant="outline" onClick={onReanalyze}>Retry unfinished analysis</Button> : null}
      <p className="mt-2 text-xs text-muted-foreground">Coverage refers to the saved transcript, not a guarantee that the transcript includes every spoken word. Additional Scripture and framework research is separate.</p>
    </section> : inFlight && !transcriptStalled ? <ArtifactPipelineBanner
      status={artifact.status} kind={artifact.kind} elapsed={elapsed}
      label={stageLabel[artifact.status] ?? "Working…"} hint={stageHint[artifact.status] ?? ""}
      onPasteTranscript={onPasteTranscript}
      onRetryAnalyze={artifact.status === "analyzing" && artifact.raw_text?.trim() ? onReanalyze : undefined}
    /> : null}
    {showTranscriptRecovery ? <section
      className={cn("mb-5 rounded-2xl border border-border bg-card p-4 text-sm", mobilePinnedPane && artifactMobileStudyContentInset)}
      data-testid="artifact-transcript-recovery" role="status">
      <p className="font-medium">Transcript hasn&apos;t arrived yet</p>
      <p className="mt-1.5 leading-relaxed text-muted-foreground">The video was saved, but it has no transcript or findings yet. Try the fetch again, or paste the transcript to keep studying.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={retryingFetch} onClick={onRetryFetch}>
          <RefreshCw className={cn("mr-1 h-3.5 w-3.5", retryingFetch && "animate-spin")} aria-hidden />
          {retryingFetch ? "Fetching..." : "Try fetch again"}
        </Button>
        <Button size="sm" variant="outline" onClick={onPasteTranscript}><FileText className="mr-1 h-3.5 w-3.5" aria-hidden />Paste transcript</Button>
      </div>
    </section> : null}
    {!versioned && artifact.error && artifact.status === "error" ? <ArtifactTranscriptFetchErrorCard
      error={artifact.error}
      variant={isNonBlockingAnalysisError({ error: artifact.error, rawText: artifact.raw_text, claimsCount: studyClaimsCount }) ? "warning" : "destructive"}
      retryingFetch={retryingFetch} inFlight={inFlight}
      showRetry={artifact.kind === "youtube" && Boolean(artifact.url) && !artifact.raw_text?.trim()}
      showReanalyze={Boolean(artifact.raw_text?.trim())} onRetry={onRetryFetch} onPaste={onPasteTranscript} onReanalyze={onReanalyze}
      className={mobilePinnedPane ? artifactMobileStudyContentInset : undefined}
    /> : null}
    {hasStudyOutput ? <ArtifactFindingsOverview artifact={artifact} /> : null}
  </>;
}
