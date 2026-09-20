import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  EXTRACTION_SYSTEM, RANKING_SYSTEM, validateCandidates, deduplicateCandidates, parseRankedFindings,
  type AnalysisBatch, type Candidate,
} from "../_shared/artifactAnalysisContract.ts";
import { AnalysisProviderError, callArtifactAnalysisJson } from "../_shared/artifactAnalysisProvider.ts";

type Run = { id: string; user_id: string; artifact_id: string; lease_token: string; phase: string;
  next_batch: number; batches: AnalysisBatch[]; candidates: Candidate[] };

Deno.serve(async req => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const body = await req.json().catch(() => ({}));
  const { data, error } = await db.rpc("artifact_analysis_claim", { p_run_id: typeof body.run_id === "string" ? body.run_id : null });
  if (error) return new Response(JSON.stringify({ error: "Could not acquire analysis work." }), { status: 500 });
  const run: Run | undefined = data?.[0];
  if (!run) return Response.json({ ok: true, idle: true });

  const work = async () => {
    try {
      const ctx = { db, userId: run.user_id, artifactId: run.artifact_id, operation: run.phase };
      if (run.phase === "extract") {
        const batch = run.batches[run.next_batch];
        if (!batch) throw new AnalysisProviderError("The saved analysis plan is invalid.", false);
        const output = await callArtifactAnalysisJson(EXTRACTION_SYSTEM, {
          section: batch.index + 1, total_sections: run.batches.length, segments: batch.segments,
          context_before: run.batches[run.next_batch - 1]?.segments.slice(-2) ?? [],
          context_after: run.batches[run.next_batch + 1]?.segments.slice(0, 2) ?? [],
          instruction: "Only extract from segments; adjacent context helps preserve qualifications but is not a new source range.",
        }, ctx);
        const candidates = validateCandidates(output, batch);
        const checkpoint = await db.rpc("artifact_analysis_checkpoint", {
          p_run_id: run.id, p_lease: run.lease_token, p_batch: run.next_batch, p_candidates: candidates,
        });
        if (checkpoint.error) throw new AnalysisProviderError("Could not save the completed section. Saved research is unchanged.", true);
      } else if (run.phase === "rank") {
        const candidates = deduplicateCandidates(run.candidates);
        const { data: beliefs, error: beliefError } = await db.from("belief_nodes")
          .select("id,topic,statement,answer").eq("user_id", run.user_id).order("id");
        if (beliefError) throw new AnalysisProviderError("Could not load belief context for comparison.", true);
        const validIds = new Set<string>((beliefs ?? []).map(b => b.id));
        // Relevance selection instead of arbitrary first-24 truncation.
        const terms = new Set(candidates.flatMap(c => `${c.claim} ${c.doctrine_tags.join(" ")}`.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []));
        const relevantBeliefs = [...(beliefs ?? [])].map(b => ({ b, score: (JSON.stringify(b).toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []).filter(t => terms.has(t)).length }))
          .sort((a, b) => b.score - a.score || a.b.id.localeCompare(b.b.id)).slice(0, 80).map(({ b }) => ({ ...b, answer: b.answer?.slice(0, 500) }));
        const output = candidates.length ? await callArtifactAnalysisJson(RANKING_SYSTEM, {
          candidates, beliefs: relevantBeliefs, belief_coverage: { supplied: relevantBeliefs.length, total: beliefs?.length ?? 0 },
          all_source_sections_completed: true,
        }, ctx) : { summary: "No substantive findings were identified in the analyzed source.", findings: [], no_findings_reason: "Every source section was processed and returned no substantive findings." };
        const ranked = parseRankedFindings(output, candidates, validIds);
        const published = await db.rpc("artifact_analysis_publish", {
          p_run_id: run.id, p_lease: run.lease_token, p_findings: ranked.findings,
          p_overview: { ...ranked.overview, no_findings_reason: ranked.noFindingsReason },
        });
        if (published.error) throw new AnalysisProviderError("Could not publish the new analysis. Previous research is unchanged.", true);
      }
    } catch (error) {
      const failure = error instanceof AnalysisProviderError ? error : new AnalysisProviderError(
        error instanceof Error ? error.message : "Analysis validation failed. Previous research is unchanged.", true);
      await db.rpc("artifact_analysis_fail", { p_run_id: run.id, p_lease: run.lease_token,
        p_error: failure.message, p_retryable: failure.retryable });
    } finally {
      // pg_net dispatches AFTER commit; cron also recovers lost requests/expired leases.
      // This is not recursive edge-to-edge chaining and does not need the browser open.
      await db.rpc("artifact_analysis_dispatch");
    }
  };
  const promise = work();
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(promise); else await promise;
  return Response.json({ ok: true, run_id: run.id }, { status: 202 });
});
