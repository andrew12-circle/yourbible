import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { artifactRowStableEqual, type ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { parseClaimEpistemology } from "@/lib/framework/epistemology";
import { normalizeArtifactClaimArrays } from "@/lib/framework/normalizeArtifactClaim";
import {
  resumeYoutubeTranscriptFetch,
  restartYoutubeTranscriptFetch,
} from "@/lib/framework/youtubeTranscriptFetch";

const YOUTUBE_FETCH_ENSURE_AFTER_MS = 6_000;
const YOUTUBE_FETCH_AUTO_RETRY_AFTER_SECONDS = 20;
const YOUTUBE_FETCH_AUTO_RETRY_INTERVAL_MS = 45_000;
const YOUTUBE_FETCH_AUTO_RETRY_LIMIT = 4;

export type ArtifactDetailClaim = {
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

export function useArtifactDetailData(artifactId: string | undefined, userId: string | undefined) {
  const [a, setA] = useState<ArtifactRow | null>(null);
  const [artifactLoaded, setArtifactLoaded] = useState(false);
  const [claims, setClaims] = useState<ArtifactDetailClaim[]>([]);
  const [matchedBeliefs, setMatchedBeliefs] = useState<Record<string, MatchedBelief>>({});
  const [moments, setMoments] = useState<ArtifactMoment[]>([]);
  const [polling, setPolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const autoRetryRef = useRef<Record<string, { count: number; lastAt: number }>>({});
  const ensureFetchRef = useRef<string | null>(null);

  const applyArtifact = useCallback((next: ArtifactRow | null) => {
    setA((prev) => {
      if (artifactRowStableEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const loadFull = useCallback(async () => {
    if (!artifactId) {
      setArtifactLoaded(true);
      applyArtifact(null);
      return;
    }
    const artWithMeta = await supabase
      .from("artifacts")
      .select("id,title,kind,status,error,raw_text,url,metadata")
      .eq("id", artifactId)
      .maybeSingle();
    const artResult = artWithMeta.error
      ? await supabase
          .from("artifacts")
          .select("id,title,kind,status,error,raw_text,url")
          .eq("id", artifactId)
          .maybeSingle()
      : artWithMeta;
    const { data: cl } = await supabase
      .from("artifact_claims")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("created_at");
    const { data: momentRows, error: momentError } = await supabase
      .from("artifact_moments")
      .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
      .eq("artifact_id", artifactId)
      .order("start_seconds")
      .order("created_at");
    const art = artResult.data as ArtifactRow | null;
    const parsedClaims = (((cl as unknown) as ArtifactDetailClaim[]) ?? []).map((row) => {
      const normalized = normalizeArtifactClaimArrays(row);
      return {
        ...normalized,
        epistemology: parseClaimEpistemology(
          (row as ArtifactDetailClaim & { epistemology?: unknown }).epistemology,
        ),
      };
    });
    const beliefIds = Array.from(
      new Set(parsedClaims.map((c) => c.matched_belief_id).filter(Boolean)),
    ) as string[];
    let beliefMap: Record<string, MatchedBelief> = {};
    if (beliefIds.length > 0) {
      const { data: beliefs } = await supabase
        .from("belief_nodes")
        .select("id,topic,statement,answer,confidence")
        .in("id", beliefIds);
      beliefMap = (beliefs ?? []).reduce((acc, belief) => {
        acc[belief.id] = belief as MatchedBelief;
        return acc;
      }, {} as Record<string, MatchedBelief>);
    }
    setMatchedBeliefs(beliefMap);
    applyArtifact(art);
    setClaims(parsedClaims);
    if (!momentError) setMoments(((momentRows as unknown) as ArtifactMoment[]) ?? []);
    setArtifactLoaded(true);
    prevStatusRef.current = art?.status ?? null;
  }, [applyArtifact, artifactId]);

  const loadStatusOnly = useCallback(async () => {
    if (!artifactId) return;
    const { data } = await supabase
      .from("artifacts")
      .select("id,title,kind,status,error,raw_text,url,metadata")
      .eq("id", artifactId)
      .maybeSingle();
    if (!data) return;
    const row = data as ArtifactRow;
    const prevStatus = prevStatusRef.current;
    applyArtifact(row);
    prevStatusRef.current = row.status;
    const terminal = row.status === "ready" || row.status === "error";
    const transitioned =
      prevStatus != null &&
      ["fetching", "transcribing", "analyzing"].includes(prevStatus) &&
      terminal;
    if (transitioned || (terminal && prevStatus !== row.status)) {
      await loadFull();
    }
  }, [applyArtifact, artifactId, loadFull]);

  useEffect(() => {
    ensureFetchRef.current = null;
  }, [artifactId]);

  useEffect(() => {
    if (!userId || !artifactId) return;
    setArtifactLoaded(false);
    void loadFull();
  }, [userId, artifactId, loadFull]);

  const inFlight = !!a && ["fetching", "transcribing", "analyzing"].includes(a.status);

  useEffect(() => {
    if (!inFlight) {
      setPolling(false);
      startedRef.current = null;
      setElapsed(0);
      return;
    }
    setPolling(true);
    if (startedRef.current === null) startedRef.current = Date.now();
    const poll = setInterval(() => void loadStatusOnly(), 2500);
    const tick = setInterval(() => {
      if (startedRef.current) setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [inFlight, loadStatusOnly]);

  useEffect(() => {
    if (!artifactLoaded || !a || a.kind !== "youtube" || a.status !== "fetching" || !a.url?.trim()) return;
    if (a.raw_text?.trim()) return;
    if (ensureFetchRef.current === a.id) return;

    const artifactId = a.id;
    const artifactUrl = a.url.trim();
    const timer = window.setTimeout(() => {
      ensureFetchRef.current = artifactId;
      void (async () => {
        const { data } = await supabase
          .from("artifacts")
          .select("status,raw_text")
          .eq("id", artifactId)
          .maybeSingle();
        if (data?.status !== "fetching" || (data.raw_text ?? "").trim()) return;
        const result = await resumeYoutubeTranscriptFetch(artifactId, artifactUrl);
        if (!result.ok) await loadStatusOnly();
      })();
    }, YOUTUBE_FETCH_ENSURE_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [artifactLoaded, a, loadStatusOnly]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || a.status !== "fetching" || !a.url) return;
    if (elapsed < YOUTUBE_FETCH_AUTO_RETRY_AFTER_SECONDS) return;

    const retry = autoRetryRef.current[a.id] ?? { count: 0, lastAt: 0 };
    const now = Date.now();
    if (retry.count >= YOUTUBE_FETCH_AUTO_RETRY_LIMIT) return;
    if (now - retry.lastAt < YOUTUBE_FETCH_AUTO_RETRY_INTERVAL_MS) return;

    autoRetryRef.current[a.id] = { count: retry.count + 1, lastAt: now };
    void restartYoutubeTranscriptFetch(a.id, a.url).then((result) => {
      if (!result.ok) void loadStatusOnly();
    });
  }, [a, elapsed, loadStatusOnly]);

  const patchArtifactMetadata = useCallback(async (targetId: string) => {
    const { data } = await supabase
      .from("artifacts")
      .select("metadata,title")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return;
    setA((prev) =>
      prev
        ? {
            ...prev,
            metadata: data.metadata ?? prev.metadata,
            title: data.title ?? prev.title,
          }
        : prev,
    );
  }, []);

  return {
    a,
    setA,
    artifactLoaded,
    claims,
    setClaims,
    matchedBeliefs,
    moments,
    setMoments,
    polling,
    elapsed,
    inFlight,
    loadFull,
    patchArtifactMetadata,
  };
}
