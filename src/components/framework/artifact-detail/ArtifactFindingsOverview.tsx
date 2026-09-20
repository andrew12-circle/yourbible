import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";

type Finding = {
  id: string; claim: string; importance_reason?: string | null; source_evidence?: unknown;
  verdict?: string | null; user_note?: string | null; needs_review?: boolean;
};
type Research = { id: string; artifact_claim_id: string; brief_summary: string | null; pack_json: unknown };
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function clock(seconds: unknown): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null;
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function Evidence({ finding, archived = false }: { finding: Finding; archived?: boolean }) {
  const evidence = record(finding.source_evidence);
  const quote = typeof evidence.quote === "string" && evidence.quote_verified === true ? evidence.quote : null;
  if (!quote) return <p className="text-xs text-muted-foreground">Source not verified. No quotation or precise timestamp has been inferred.</p>;
  const time = evidence.timing === "unavailable" ? null : clock(evidence.start_seconds);
  return <details className="mt-2 text-sm">
    <summary className="cursor-pointer font-medium">{archived ? "Saved source quotation" : "Supporting source quotation"}{time ? ` · ${evidence.timing === "estimated" ? "approximately " : ""}${time}` : " · timing unavailable"}</summary>
    <blockquote className="my-2 whitespace-pre-wrap border-l-2 border-border pl-3 text-muted-foreground">{quote}</blockquote>
    <p className="text-xs text-muted-foreground">Matched to the saved transcript version. A text match does not establish truth or verify the speaker&apos;s intent.</p>
  </details>;
}

/** A small ranked overview sits above the existing chronological study workspace. */
export default function ArtifactFindingsOverview({ artifact }: { artifact: ArtifactRow }) {
  const { user } = useAuth();
  const metadata = record(artifact.metadata);
  const overview = record(metadata.findings_overview);
  const analysis = record(metadata.analysis);
  const primaryIdsKey = JSON.stringify(Array.isArray(overview.primary_ids) ? overview.primary_ids : []);
  const primaryIds = useMemo(() => (JSON.parse(primaryIdsKey) as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 8), [primaryIdsKey]);
  const scope = `${user?.id ?? ""}:${artifact.id}:${String(analysis.run_id ?? "")}:${primaryIdsKey}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const [primary, setPrimary] = useState<{ scope: string; rows: Finding[]; error: boolean }>({ scope: "", rows: [], error: false });
  const [history, setHistory] = useState<{ scope: string; rows: Finding[]; research: Research[]; total: number; error: string; busy: boolean }>({ scope: "", rows: [], research: [], total: 0, error: "", busy: false });
  const historyBusy = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !primaryIds.length) { setPrimary({ scope, rows: [], error: false }); return; }
    void supabase.from("artifact_claims").select("id,claim,importance_reason,source_evidence,verdict,user_note,needs_review")
      .eq("artifact_id", artifact.id).eq("user_id", user.id).in("id", primaryIds).then(({ data, error }) => {
        if (cancelled || scopeRef.current !== scope) return;
        const rows = (data ?? []) as unknown as Finding[];
        setPrimary({ scope, rows: primaryIds.flatMap((id) => rows.filter((row) => row.id === id)), error: Boolean(error) });
      });
    return () => { cancelled = true; };
  }, [artifact.id, primaryIds, scope, user?.id]);
  useEffect(() => { historyBusy.current = false; }, [scope]);

  const loadHistory = async (append = false) => {
    if (!user?.id || historyBusy.current) return;
    historyBusy.current = true;
    const old = append && history.scope === scope ? history.rows : [];
    const oldResearch = append && history.scope === scope ? history.research : [];
    setHistory({ scope, rows: old, research: oldResearch, total: history.scope === scope ? history.total : 0, error: "", busy: true });
    try {
      const result = await supabase.from("artifact_claims")
        .select("id,claim,source_evidence,verdict,user_note,needs_review", { count: "exact" })
        .eq("artifact_id", artifact.id).eq("user_id", user.id).eq("is_current", false)
        .order("created_at", { ascending: false }).order("id").range(old.length, old.length + 49);
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as unknown as Finding[];
      const research: Research[] = [];
      if (rows.length) for (let from = 0; ; from += 200) {
        const saved = await supabase.from("artifact_claim_research_runs").select("id,artifact_claim_id,brief_summary,pack_json")
          .eq("artifact_id", artifact.id).eq("user_id", user.id).in("artifact_claim_id", rows.map((r) => r.id))
          .order("created_at").order("id").range(from, from + 199);
        if (saved.error) throw saved.error;
        const page = (saved.data ?? []) as unknown as Research[];
        research.push(...page);
        if (page.length < 200) break;
      }
      if (scopeRef.current === scope) setHistory({ scope, rows: [...old, ...rows], research: [...oldResearch, ...research], total: result.count ?? old.length + rows.length, error: "", busy: false });
    } catch {
      if (scopeRef.current === scope) setHistory({ scope, rows: old, research: oldResearch, total: history.total, error: "Research history could not be loaded. It has not been deleted. Check the connection and deployed analysis migration.", busy: false });
    } finally { if (scopeRef.current === scope) historyBusy.current = false; }
  };
  const currentHistory = history.scope === scope ? history : null;
  const currentPrimary = primary.scope === scope ? primary : null;
  return <section className="mb-4 rounded-2xl border border-border bg-card p-4 sm:p-5" data-testid="artifact-findings-overview">
    {typeof overview.summary === "string" && analysis.status === "complete" ? <>
      <h2 className="text-base font-semibold">Principal findings</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{overview.summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">Selected for importance to the source&apos;s argument, not agreement or truth. Scripture evaluation and comparison with your beliefs are separate research steps.</p>
      {currentPrimary?.error ? <p className="mt-3 text-sm" role="alert">Principal findings could not be loaded. The full study workspace remains available.</p> : null}
      <div className="mt-4 space-y-3">{currentPrimary?.rows.map((finding) => <article key={finding.id} className="rounded-xl border border-border p-3">
        <h3 className="text-sm font-medium leading-relaxed">{finding.claim}</h3>
        {finding.importance_reason ? <p className="mt-1 text-xs text-muted-foreground"><strong>Why selected:</strong> {finding.importance_reason}</p> : null}
        <Evidence finding={finding} />
        {finding.needs_review ? <p className="mt-2 text-xs">Your previous verdict was preserved. Review it against this source version.</p> : null}
      </article>)}</div>
      {typeof overview.findings_count === "number" ? <p className="mt-3 text-xs text-muted-foreground">{overview.findings_count} distinct findings retained. The study workspace below remains in transcript order.</p> : null}
    </> : <p className="text-sm text-muted-foreground">{analysis.run_id ? "Previous completed findings remain available while this analysis is unfinished." : "Legacy findings do not have verified full-source coverage. Re-analysis creates a new version without deleting your research."}</p>}
    <details className="mt-4 border-t border-border pt-3" onToggle={(event) => {
      if (event.currentTarget.open && history.scope !== scope) void loadHistory();
    }}>
      <summary className="cursor-pointer text-sm font-medium">Earlier findings and saved research</summary>
      <p className="mt-2 text-xs text-muted-foreground">Archived findings belong to earlier analyses. Their verdicts, notes, quotations, and research remain separate from current findings.</p>
      {currentHistory?.error ? <p className="my-2 text-sm" role="alert">{currentHistory.error} <Button size="sm" variant="outline" onClick={() => void loadHistory()}>Retry</Button></p> : null}
      {currentHistory && !currentHistory.busy && !currentHistory.error && !currentHistory.rows.length ? <p className="mt-3 text-sm text-muted-foreground">No archived findings.</p> : null}
      <div className="mt-3 space-y-3">{currentHistory?.rows.map((finding) => <article key={finding.id} className="rounded-xl border border-border p-3">
        <p className="text-sm font-medium">{finding.claim}</p>
        {finding.verdict ? <p className="mt-1 text-sm">Saved verdict: {finding.verdict}</p> : null}
        {finding.user_note ? <p className="mt-2 whitespace-pre-wrap text-sm">{finding.user_note}</p> : null}
        <Evidence finding={finding} archived />
        {currentHistory.research.filter((r) => r.artifact_claim_id === finding.id).map((research) => <details key={research.id} className="mt-2 text-sm">
          <summary className="cursor-pointer">Saved research</summary>
          {research.brief_summary ? <p className="my-2 whitespace-pre-wrap">{research.brief_summary}</p> : null}
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs">{JSON.stringify(research.pack_json, null, 2)}</pre>
        </details>)}
      </article>)}</div>
      {currentHistory?.busy ? <p className="mt-2 text-sm" role="status">Loading saved research…</p> : null}
      {currentHistory && currentHistory.rows.length < currentHistory.total ? <Button className="mt-3" size="sm" variant="outline" disabled={currentHistory.busy} onClick={() => void loadHistory(true)}>Load more ({currentHistory.rows.length} of {currentHistory.total})</Button> : null}
    </details>
  </section>;
}
