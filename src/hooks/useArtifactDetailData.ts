import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { artifactRowStableEqual, type ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { parseClaimEpistemology } from "@/lib/framework/epistemology";
import { normalizeArtifactClaimArrays } from "@/lib/framework/normalizeArtifactClaim";
import { markArtifactLibrarySeen } from "@/lib/framework/artifactLibrarySeen";

export type ArtifactDetailClaim = {
  id: string; claim: string; verdict: string | null; tone: string | null;
  doctrine_tags: string[] | null; match_relation: string | null; matched_belief_id: string | null;
  bias_flags: string[] | null; scripture_supports: { ref: string; note?: string | null }[] | null;
  scripture_challenges: { ref: string; note?: string | null }[] | null;
  epistemology?: unknown; chapter_start_seconds?: number | null; chapter_title?: string | null;
  source_evidence?: unknown; importance_score?: number; importance_reason?: string | null;
  finding_kind?: string | null; is_current?: boolean; needs_review?: boolean; user_note?: string | null;
  created_at: string;
};
export type MatchedBelief = { id: string; topic: string | null; statement: string; answer: string | null; confidence: number };
export type ArtifactMoment = {
  id: string; user_id: string; artifact_id: string; start_seconds: number; end_seconds: number | null;
  kind: string; body: string | null; label: string | null; created_at: string;
};
const BASE_CLAIMS = "id,claim,verdict,tone,doctrine_tags,match_relation,matched_belief_id,bias_flags,scripture_supports,scripture_challenges,epistemology,chapter_start_seconds,created_at,user_note";
const VERSIONED_CLAIMS = `${BASE_CLAIMS},source_evidence,importance_score,importance_reason,finding_kind,is_current,needs_review`;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** One scope-guarded polling loop; refreshes data in place and never changes server job status. */
export function useArtifactDetailData(artifactId: string | undefined, userId: string | undefined) {
  const [a, setA] = useState<ArtifactRow | null>(null);
  const [artifactLoaded, setArtifactLoaded] = useState(false);
  const [claims, setClaims] = useState<ArtifactDetailClaim[]>([]);
  const [matchedBeliefs, setMatchedBeliefs] = useState<Record<string, MatchedBelief>>({});
  const [moments, setMoments] = useState<ArtifactMoment[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [polling, setPolling] = useState(false);
  const loadedScopeRef = useRef("");
  const reloadRef = useRef<(() => Promise<void>) | null>(null);
  const scopeRef = useRef("");
  scopeRef.current = `${userId ?? ""}:${artifactId ?? ""}`;
  const loadFull = useCallback(async () => { await reloadRef.current?.(); }, []);

  useEffect(() => {
    const scope = `${userId ?? ""}:${artifactId ?? ""}`;
    let alive = true;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let loadedArtifact: ArtifactRow | null = null;
    let detailsVersion = "";
    let lastDetailsAt = 0;
    let warned = false;
    let inFlightStarted = 0;
    const current = () => alive && scopeRef.current === scope;
    setA(null); setClaims([]); setMoments([]); setMatchedBeliefs({}); setElapsed(0); setPolling(false);
    setArtifactLoaded(!artifactId || !userId);
    if (!artifactId || !userId) { loadedScopeRef.current = scope; return () => { alive = false; }; }

    const refresh = async (force = false) => {
      if (!current() || busy) return;
      busy = true;
      try {
        // Exclude raw_text from routine progress polling. Reload it on transcript/status/token changes.
        const status = await supabase.from("artifacts")
          .select("id,title,kind,status,error,url,metadata,created_at,processing_token")
          .eq("id", artifactId).maybeSingle();
        if (status.error) throw status.error;
        if (!current()) return;
        if (!status.data) { loadedScopeRef.current = scope; setA(null); setArtifactLoaded(true); return; }
        const changedSource = !loadedArtifact || status.data.processing_token !== loadedArtifact.processing_token ||
          status.data.status !== loadedArtifact.status;
        let next = { ...loadedArtifact, ...status.data } as ArtifactRow;
        if (force || changedSource) {
          const full = await supabase.from("artifacts")
            .select("id,title,kind,status,error,raw_text,url,metadata,created_at,processing_token")
            .eq("id", artifactId).maybeSingle();
          if (full.error) throw full.error;
          if (!current() || !full.data) return;
          next = full.data as ArtifactRow;
        }
        loadedArtifact = next;
        loadedScopeRef.current = scope;
        setA((previous) => artifactRowStableEqual(previous, next) ? previous : next);
        setArtifactLoaded(true);
        const working = ["fetching", "transcribing", "analyzing"].includes(next.status);
        setPolling(working);
        if (working) { inFlightStarted ||= Date.now(); setElapsed(Math.floor((Date.now() - inFlightStarted) / 1000)); }
        else { inFlightStarted = 0; setElapsed(0); }
        // A published version is loaded once. While a new version runs, keep existing research mounted.
        const version = JSON.stringify([next.processing_token, next.status, (next.metadata as Record<string, unknown> | null)?.findings_overview]);
        if (force || detailsVersion !== version || Date.now() - lastDetailsAt >= 30_000) {
          const rows: ArtifactDetailClaim[] = [];
          for (let from = 0; ; from += 500) {
            let result = await supabase.from("artifact_claims").select(VERSIONED_CLAIMS).eq("artifact_id", artifactId)
              .order("created_at").order("id").range(from, from + 499);
            // Rolling deployment compatibility, not a silent fallback for authorization/network failures.
            if (result.error && ["42703", "PGRST204"].includes(result.error.code)) {
              result = await supabase.from("artifact_claims").select(BASE_CLAIMS).eq("artifact_id", artifactId)
                .order("created_at").order("id").range(from, from + 499);
            }
            if (result.error) throw result.error;
            if (!current()) return;
            const page = (result.data ?? []) as unknown as ArtifactDetailClaim[];
            rows.push(...page.filter((row) => row.is_current !== false).map((row) => ({
              ...normalizeArtifactClaimArrays(row), epistemology: parseClaimEpistemology(row.epistemology),
            })));
            if (page.length < 500) break;
          }
          const momentResult = await supabase.from("artifact_moments")
            .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
            .eq("artifact_id", artifactId).order("start_seconds").order("id");
          if (momentResult.error) throw momentResult.error;
          const ids = [...new Set(rows.map((row) => row.matched_belief_id).filter((id): id is string => Boolean(id)))];
          const beliefMap: Record<string, MatchedBelief> = {};
          for (let from = 0; from < ids.length; from += 100) {
            const result = await supabase.from("belief_nodes").select("id,topic,statement,answer,confidence").in("id", ids.slice(from, from + 100));
            if (result.error) throw result.error;
            for (const belief of result.data ?? []) beliefMap[belief.id] = belief as MatchedBelief;
          }
          if (!current()) return;
          setClaims((previous) => equal(previous, rows) ? previous : rows);
          setMoments((previous) => equal(previous, momentResult.data) ? previous : momentResult.data as ArtifactMoment[]);
          setMatchedBeliefs((previous) => equal(previous, beliefMap) ? previous : beliefMap);
          detailsVersion = version;
          lastDetailsAt = Date.now();
        }
        warned = false;
      } catch (error) {
        if (current() && !warned) {
          warned = true;
          toast({ title: "Could not refresh artifact", description: "Existing content has been kept. The app will retry the connection.", variant: "destructive" });
          console.warn("Artifact refresh failed", error instanceof Error ? error.name : "request_error");
        }
      } finally { busy = false; }
    };
    const cycle = async () => {
      await refresh();
      if (current()) timer = setTimeout(cycle, document.hidden ? 15_000 : 5000);
    };
    const reload = () => refresh(true);
    reloadRef.current = reload;
    const onFocus = () => { if (!document.hidden) void refresh(true); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("online", onFocus);
    void cycle();
    void markArtifactLibrarySeen(userId, artifactId);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (reloadRef.current === reload) reloadRef.current = null;
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [artifactId, userId]);

  const patchArtifactMetadata = useCallback(async (targetId: string) => {
    if (targetId !== artifactId) return;
    await loadFull();
  }, [artifactId, loadFull]);
  const inFlight = Boolean(a && ["fetching", "transcribing", "analyzing"].includes(a.status));
  const visible = loadedScopeRef.current === scopeRef.current;
  return { a: visible ? a : null, setA, artifactLoaded: visible && artifactLoaded,
    claims: visible ? claims : [], setClaims, matchedBeliefs: visible ? matchedBeliefs : {},
    moments: visible ? moments : [], setMoments, polling: visible && polling,
    elapsed: visible ? elapsed : 0, inFlight: visible && inFlight, loadFull, patchArtifactMetadata };
}
