import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { Button } from "@/components/ui/button";

export function readArtifactAnalysisState(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).analysis_v2;
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.state !== "string") return null;
  return { state: row.state, phase: String(row.phase ?? "extract"),
    completed: typeof row.completed_sections === "number" ? row.completed_sections : 0,
    total: typeof row.total_sections === "number" ? row.total_sections : 0,
    candidates: typeof row.candidate_count === "number" ? row.candidate_count : 0,
    updatedAt: typeof row.updated_at === "string" ? Date.parse(row.updated_at) : 0 };
}

export default function ArtifactAnalysisStatus({ artifact, findingsCount, onResume }: {
  artifact: ArtifactRow; findingsCount: number; onResume: () => void;
}) {
  const analysis = readArtifactAnalysisState(artifact.metadata);
  if (!analysis) return null;
  const complete = analysis.state === "complete";
  const stopped = ["partial", "failed", "stale", "superseded"].includes(analysis.state);
  const unresponsive = !complete && !stopped && analysis.updatedAt > 0 && Date.now() - analysis.updatedAt > 4 * 60 * 1000;
  return (
    <section className="mb-4 rounded-xl border border-border/60 px-4 py-3 text-sm" role="status" aria-live="polite" data-testid="artifact-analysis-status">
      <p className="font-medium">{complete ? findingsCount ? "Analysis complete" : "Analysis complete · no substantive findings"
        : stopped || unresponsive ? "Analysis incomplete" : analysis.phase === "rank" ? "Selecting principal findings" : "Analyzing transcript sections"}</p>
      <p className="mt-1 text-muted-foreground">
        {analysis.completed} of {analysis.total} sections processed.
        {!complete && findingsCount > 0 ? " Your previous findings and research remain available until replacement results are ready." : ""}
        {complete && analysis.candidates > findingsCount ? ` ${analysis.candidates} candidates evaluated; ${findingsCount} findings published after consolidation.` : ""}
      </p>
      {artifact.error ? <p className="mt-2 text-muted-foreground">{artifact.error}</p> : null}
      {stopped || unresponsive ? <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onResume}>Resume unfinished analysis</Button> : null}
    </section>
  );
}
