import type { ArtifactFindingEvidence } from "@/lib/framework/artifactFindingEvidence";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { artifactRowStableEqual, type ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { parseClaimEpistemology } from "@/lib/framework/epistemology";
import { normalizeArtifactClaimArrays } from "@/lib/framework/normalizeArtifactClaim";
import { markArtifactLibrarySeen } from "@/lib/framework/artifactLibrarySeen";
import { reconcileArtifactClaims } from "@/lib/framework/reconcileArtifactClaims";

export type ArtifactDetailClaim = ArtifactFindingEvidence & {
  id: string;
  claim: string;
  verdict: string | null;
  tone: string | null;
  doctrine_tags: string[] | null;
  match_relation: string | null;
  matched_belief_id: string | null;
  bias_flags: string[] | null;
  scripture_supports: { ref: string; note?: string | null }[] | null;
  scripture_challenges: { ref: string; note?: string | null }[] | null;
  epistemology?: unknown;
  chapter_start_seconds?: number | null;
  chapter_title?: string | null;
  created_at: string;
};

export type MatchedBelief = {
  id: string;
  topic: string | null;
  statement: string;
  answer: string | null;
  confidence: number;
};

export type ArtifactMoment = {
  id: string;
  user_id: string;
  artifact_id: string;
  start_seconds: number;
  end_seconds: number | null;
  kind: string;
  body: string | null;
  label: string | null;
  created_at: string;
};

const LEGACY_CLAIM_FIELDS = "id,claim,verdict,tone,doctrine_tags,match_relation,matched_belief_id,bias_flags,scripture_supports,scripture_challenges,epistemology,chapter_start_seconds,created_at,user_note,deferred_at";
const CLAIM_FIELDS = `${LEGACY_CLAIM_FIELDS},analysis_run_id,source_quote,source_segment_ids,source_start_seconds,source_end_seconds,source_timing_kind,importance_score,importance_reason,is_primary,retired_at`;

export function useArtifactDetailData(artifactId: string | undefined, userId: string | undefined) {
  const [a, setA] = useState<ArtifactRow | null>(null);
  const [artifactLoaded, setArtifactLoaded] = useState(false);
  const [claims, setClaims] = useState<ArtifactDetailClaim[]>([]);
  const [matchedBeliefs, setMatchedBeliefs] = useState<Record<string, MatchedBelief>>({});
  const [moments, setMoments] = useState<ArtifactMoment[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const scope = `${userId ?? ""}:${artifactId ?? ""}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const requestSequence = useRef(0);

  const loadFull = useCallback(async () => {
    if (!artifactId || !userId) return;
    const sequence = ++requestSequence.current;
    const isCurrent = () => currentScope.current === scope && requestSequence.current === sequence;
    const { data: row, error } = await supabase.from("artifacts")
      .select("id,title,kind,status,error,raw_text,url,metadata,created_at,updated_at,processing_token")
      .eq("id", artifactId).eq("user_id", userId).maybeSingle();
    if (!isCurrent()) return;
    if (error) { console.warn("[artifacts] refresh failed", error.message); return; }
    setA(prev => artifactRowStableEqual(prev, row as ArtifactRow | null) ? prev : row as ArtifactRow | null);
    setArtifactLoaded(true);
    if (!row) return;
    let result = await supabase.from("artifact_claims").select(CLAIM_FIELDS).eq("artifact_id", artifactId).order("created_at");
    if (result.error?.code === "42703") result = await supabase.from("artifact_claims").select(LEGACY_CLAIM_FIELDS).eq("artifact_id", artifactId).order("created_at");
    const { data: momentRows, error: momentError } = await supabase.from("artifact_moments")
      .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
      .eq("artifact_id", artifactId).order("start_seconds").order("created_at");
    if (!isCurrent()) return;
    if (!result.error) {
      const parsed = (result.data as unknown as ArtifactDetailClaim[] ?? [])
        .filter(c => !c.retired_at).map(c => ({ ...normalizeArtifactClaimArrays(c), epistemology: parseClaimEpistemology(c.epistemology) }));
      setClaims(prev => reconcileArtifactClaims(prev, parsed));
      const beliefIds = [...new Set(parsed.map(c => c.matched_belief_id).filter((id): id is string => Boolean(id)))];
      if (!beliefIds.length) setMatchedBeliefs(prev => Object.keys(prev).length ? {} : prev);
      else {
        const beliefRows = await supabase.from("belief_nodes").select("id,topic,statement,answer,confidence").in("id", beliefIds).eq("user_id", userId);
        if (!isCurrent()) return;
        if (!beliefRows.error) {
          const next = Object.fromEntries((beliefRows.data ?? []).map(b => [b.id, b as MatchedBelief]));
          setMatchedBeliefs(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
        }
      }
    }
    if (!momentError) setMoments(prev => {
      const next = momentRows as ArtifactMoment[] ?? [];
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [artifactId, userId, scope]);

  useEffect(() => {
    setA(null); setClaims([]); setMoments([]); setMatchedBeliefs({}); setArtifactLoaded(false);
    if (!userId || !artifactId) { setArtifactLoaded(true); return; }
    void loadFull();
    return () => { requestSequence.current++; };
  }, [artifactId, userId, loadFull]);

  const inFlight = Boolean(a && ["fetching", "transcribing", "analyzing"].includes(a.status));
  useEffect(() => {
    if (!inFlight) { setElapsed(0); return; }
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try { await loadFull(); } finally {
        if (!cancelled) poll = setTimeout(refresh, 3000);
      }
    };
    poll = setTimeout(refresh, 3000);
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => { cancelled = true; clearTimeout(poll); clearInterval(tick); };
  }, [inFlight, loadFull]);

  useEffect(() => {
    const visible = () => { if (!document.hidden) void loadFull(); };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [loadFull]);

  useEffect(() => {
    if (userId && artifactId && artifactLoaded && a?.id === artifactId) void markArtifactLibrarySeen(userId, artifactId);
  }, [userId, artifactId, artifactLoaded, a?.id]);

  const patchArtifactMetadata = useCallback(async (targetId: string) => {
    if (targetId !== artifactId) return;
    const result = await supabase.from("artifacts").select("metadata,title").eq("id", targetId).maybeSingle();
    if (currentScope.current !== scope || !result.data) return;
    const next = result.data;
    setA(prev => prev?.id === targetId ? { ...prev, metadata: next.metadata, title: next.title } : prev);
  }, [artifactId, scope]);

  return { a, setA, artifactLoaded, claims, setClaims, matchedBeliefs, moments, setMoments,
    polling: inFlight, elapsed, inFlight, loadFull, patchArtifactMetadata };
}
