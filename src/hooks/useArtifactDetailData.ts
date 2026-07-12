import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { artifactRowStableEqual, type ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { peekArtifactShellCache } from "@/lib/framework/artifactShellCache";
import { parseClaimEpistemology } from "@/lib/framework/epistemology";
import { normalizeArtifactClaimArrays } from "@/lib/framework/normalizeArtifactClaim";
import { markArtifactLibrarySeen } from "@/lib/framework/artifactLibrarySeen";
import { isManualYoutubeFetchActive } from "@/lib/framework/youtubeFetchCoordinator";
import {
  markYoutubeTranscriptFetchError,
  retryYoutubeTranscriptFetch,
} from "@/lib/framework/youtubeTranscriptFetch";
import { resolveYouTubeVideoId } from "@/lib/youtube";
import { isReadableDocumentKind } from "@/lib/framework/documentArtifact";
import {
  analyzeClientTimeoutSeconds,
  analyzeStaleSeconds,
  analyzeTimeoutMessage,
  ANALYZE_AUTO_RETRY_LIMIT,
} from "@/lib/framework/analyzeTimeouts";
import { shouldRepairRateLimitArtifact } from "@/lib/framework/artifactAnalysisRecovery";

const YOUTUBE_FETCH_ENSURE_AFTER_MS = 30_000;
const YOUTUBE_FETCH_AUTO_RETRY_AFTER_SECONDS = 20;
const YOUTUBE_FETCH_AUTO_RETRY_INTERVAL_MS = 45_000;
const YOUTUBE_FETCH_AUTO_RETRY_LIMIT = 4;
const YOUTUBE_FETCH_CLIENT_TIMEOUT_SECONDS = 200;

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
  const [a, setA] = useState<ArtifactRow | null>(() => peekArtifactShellCache(artifactId));
  const [artifactLoaded, setArtifactLoaded] = useState(() => Boolean(peekArtifactShellCache(artifactId)));
  const [claims, setClaims] = useState<ArtifactDetailClaim[]>([]);
  const [matchedBeliefs, setMatchedBeliefs] = useState<Record<string, MatchedBelief>>({});
  const [moments, setMoments] = useState<ArtifactMoment[]>([]);
  const [polling, setPolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const autoRetryRef = useRef<Record<string, { count: number; lastAt: number }>>({});
  const analyzeRetryRef = useRef<Record<string, number>>({});
  const analyzeClientTimeoutRef = useRef<string | null>(null);
  const ensureFetchRef = useRef<string | null>(null);
  const clientTimeoutRef = useRef<string | null>(null);

  const applyArtifact = useCallback((next: ArtifactRow | null) => {
    setA((prev) => {
      if (artifactRowStableEqual(prev, next)) return prev;
      return next;
    });
  }, []);

  const repairRateLimitArtifactRow = useCallback(async (
    targetId: string,
    row: ArtifactRow | null,
  ): Promise<ArtifactRow | null> => {
    if (
      row &&
      shouldRepairRateLimitArtifact({
        status: row.status,
        error: row.error,
        rawText: row.raw_text,
      })
    ) {
      await supabase.from("artifacts").update({ status: "ready", error: null }).eq("id", targetId);
      return { ...row, status: "ready", error: null };
    }
    return row;
  }, []);

  const fetchArtifactRow = useCallback(async (targetId: string): Promise<ArtifactRow | null> => {
    const artWithMeta = await supabase
      .from("artifacts")
      .select("id,title,kind,status,error,raw_text,url,metadata,created_at")
      .eq("id", targetId)
      .maybeSingle();
    const artResult = artWithMeta.error
      ? await supabase
          .from("artifacts")
          .select("id,title,kind,status,error,raw_text,url,created_at")
          .eq("id", targetId)
          .maybeSingle()
      : artWithMeta;
    const row = (artResult.data as ArtifactRow | null) ?? null;
    return repairRateLimitArtifactRow(targetId, row);
  }, [repairRateLimitArtifactRow]);

  const loadClaimsOnly = useCallback(async () => {
    if (!artifactId) return;
    const { data: cl } = await supabase
      .from("artifact_claims")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("created_at");
    const parsedClaims = (((cl as unknown) as ArtifactDetailClaim[]) ?? []).map((row) => {
      const normalized = normalizeArtifactClaimArrays(row);
      return {
        ...normalized,
        epistemology: parseClaimEpistemology(
          (row as ArtifactDetailClaim & { epistemology?: unknown }).epistemology,
        ),
      };
    });
    setClaims((prev) => {
      if (prev.length === parsedClaims.length && prev.every((p, i) => p.id === parsedClaims[i]?.id)) {
        return prev;
      }
      return parsedClaims;
    });
    const beliefIds = Array.from(
      new Set(parsedClaims.map((c) => c.matched_belief_id).filter(Boolean)),
    ) as string[];
    if (beliefIds.length === 0) return;
    const { data: beliefs } = await supabase
      .from("belief_nodes")
      .select("id,topic,statement,answer,confidence")
      .in("id", beliefIds);
    setMatchedBeliefs((beliefs ?? []).reduce((acc, belief) => {
      acc[belief.id] = belief as MatchedBelief;
      return acc;
    }, {} as Record<string, MatchedBelief>));
  }, [artifactId]);

  const loadArtifactDetails = useCallback(async () => {
    if (!artifactId) return;
    const [{ data: cl }, { data: momentRows, error: momentError }] = await Promise.all([
      supabase
        .from("artifact_claims")
        .select("*")
        .eq("artifact_id", artifactId)
        .order("created_at"),
      supabase
        .from("artifact_moments")
        .select("id,user_id,artifact_id,start_seconds,end_seconds,kind,body,label,created_at")
        .eq("artifact_id", artifactId)
        .order("start_seconds")
        .order("created_at"),
    ]);
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
    setClaims(parsedClaims);
    if (!momentError) setMoments(((momentRows as unknown) as ArtifactMoment[]) ?? []);
  }, [artifactId]);

  /** Fetch artifact row first so YouTube embed can mount while claims load. */
  const loadShell = useCallback(async () => {
    if (!artifactId) {
      setArtifactLoaded(true);
      applyArtifact(null);
      return;
    }
    const art = await fetchArtifactRow(artifactId);
    applyArtifact(art);
    prevStatusRef.current = art?.status ?? null;
    setArtifactLoaded(true);
    void loadArtifactDetails();
  }, [applyArtifact, artifactId, fetchArtifactRow, loadArtifactDetails]);

  const loadFull = useCallback(async () => {
    if (!artifactId) {
      setArtifactLoaded(true);
      applyArtifact(null);
      return;
    }
    const art = await fetchArtifactRow(artifactId);
    applyArtifact(art);
    prevStatusRef.current = art?.status ?? null;
    setArtifactLoaded(true);
    await loadArtifactDetails();
  }, [applyArtifact, artifactId, fetchArtifactRow, loadArtifactDetails]);

  const loadStatusOnly = useCallback(async () => {
    if (!artifactId) return;
    const { data } = await supabase
      .from("artifacts")
      .select("id,title,kind,status,error,raw_text,url,metadata,created_at")
      .eq("id", artifactId)
      .maybeSingle();
    if (!data) return;
    const row = await repairRateLimitArtifactRow(artifactId, data as ArtifactRow);
    if (!row) return;
    const prevStatus = prevStatusRef.current;
    applyArtifact(row);
    prevStatusRef.current = row.status;
    if (row.status === "analyzing" || row.status === "ready") {
      await loadClaimsOnly();
    }
    const terminal = row.status === "ready" || row.status === "error";
    const transitioned =
      prevStatus != null &&
      ["fetching", "transcribing", "analyzing"].includes(prevStatus) &&
      terminal;
    if (transitioned && row.status === "ready" && row.error?.trim()) {
      toast({
        title: "Analysis finished with a note",
        description: row.error,
        variant: "destructive",
      });
    }
    if (transitioned || (terminal && prevStatus !== row.status)) {
      await loadFull();
    }
  }, [applyArtifact, artifactId, loadClaimsOnly, loadFull, repairRateLimitArtifactRow]);

  useEffect(() => {
    ensureFetchRef.current = null;
    clientTimeoutRef.current = null;
    analyzeClientTimeoutRef.current = null;
    analyzeRetryRef.current = {};
  }, [artifactId]);

  useEffect(() => {
    if (!userId || !artifactId || !artifactLoaded || !a) return;
    void markArtifactLibrarySeen(userId, artifactId);
  }, [userId, artifactId, artifactLoaded, a]);

  useEffect(() => {
    if (!userId || !artifactId) return;
    const cached = peekArtifactShellCache(artifactId);
    if (cached) {
      applyArtifact(cached);
      setArtifactLoaded(true);
    } else {
      setArtifactLoaded(false);
      applyArtifact(null);
    }
    setClaims([]);
    setMoments([]);
    setMatchedBeliefs({});
    void loadShell();
  }, [applyArtifact, userId, artifactId, loadShell]);

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
    const poll = setInterval(() => void loadStatusOnly(), a?.status === "analyzing" ? 1500 : 2500);
    const tick = setInterval(() => {
      if (startedRef.current) setElapsed(Math.floor((Date.now() - startedRef.current) / 1000));
    }, 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [a?.status, inFlight, loadStatusOnly]);

  useEffect(() => {
    if (!a || a.status !== "analyzing") return;
    const pollClaims = setInterval(() => void loadClaimsOnly(), 2000);
    return () => clearInterval(pollClaims);
  }, [a?.id, a?.status, loadClaimsOnly]);

  /** Background analyze may append claims after status flips to ready. */
  useEffect(() => {
    if (!a || a.status !== "ready" || a.kind === "youtube") return;
    if (!isReadableDocumentKind(a.kind)) return;
    const pollClaims = setInterval(() => void loadClaimsOnly(), 3000);
    const stop = window.setTimeout(() => clearInterval(pollClaims), 3 * 60 * 1000);
    return () => {
      clearInterval(pollClaims);
      window.clearTimeout(stop);
    };
  }, [a?.id, a?.kind, a?.status, loadClaimsOnly]);

  useEffect(() => {
    if (!artifactLoaded || !a || a.kind !== "youtube" || a.status !== "fetching" || !a.url?.trim()) return;
    if (a.raw_text?.trim()) return;
    if (ensureFetchRef.current === a.id) return;
    if (isManualYoutubeFetchActive(a.id)) return;

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
        const fetchOpts = {
          videoId: resolveYouTubeVideoId(artifactUrl, a?.metadata),
          metadata: a?.metadata,
          createdAt: a?.created_at,
        };
        const result = await retryYoutubeTranscriptFetch(artifactId, artifactUrl, fetchOpts);
        if (!result.ok) await loadStatusOnly();
      })();
    }, YOUTUBE_FETCH_ENSURE_AFTER_MS);

    return () => window.clearTimeout(timer);
  }, [artifactLoaded, a, loadStatusOnly]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || a.status !== "fetching" || !a.url) return;
    if (elapsed < YOUTUBE_FETCH_CLIENT_TIMEOUT_SECONDS) return;
    if (clientTimeoutRef.current === a.id) return;
    clientTimeoutRef.current = a.id;
    void markYoutubeTranscriptFetchError(
      a.id,
      "Transcript fetch is taking too long. Tap Retry, paste captions, or try again in a few minutes.",
    ).then(() => loadStatusOnly());
  }, [a, elapsed, loadStatusOnly]);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || a.status !== "fetching" || !a.url) return;
    if (isManualYoutubeFetchActive(a.id)) return;
    if (elapsed < YOUTUBE_FETCH_AUTO_RETRY_AFTER_SECONDS) return;

    const retry = autoRetryRef.current[a.id] ?? { count: 0, lastAt: 0 };
    const now = Date.now();
    if (retry.count >= YOUTUBE_FETCH_AUTO_RETRY_LIMIT) return;
    if (now - retry.lastAt < YOUTUBE_FETCH_AUTO_RETRY_INTERVAL_MS) return;

    autoRetryRef.current[a.id] = { count: retry.count + 1, lastAt: now };
    void retryYoutubeTranscriptFetch(a.id, a.url, {
      videoId: resolveYouTubeVideoId(a.url, a.metadata),
      metadata: a.metadata,
      createdAt: a.created_at,
    }).then((result) => {
      if (!result.ok) void loadStatusOnly();
    });
  }, [a, elapsed, loadStatusOnly]);

  const transcriptLength = a?.raw_text?.trim().length ?? 0;
  const analyzeStaleSec = analyzeStaleSeconds(transcriptLength);
  const analyzeClientTimeoutSec = analyzeClientTimeoutSeconds(transcriptLength);

  useEffect(() => {
    if (!a || a.status !== "analyzing" || !a.raw_text?.trim()) return;
    if (transcriptLength >= 40_000) return;
    if (elapsed < analyzeStaleSec) return;

    const retries = analyzeRetryRef.current[a.id] ?? 0;
    if (retries >= ANALYZE_AUTO_RETRY_LIMIT) return;

    analyzeRetryRef.current[a.id] = retries + 1;
    void (async () => {
      const { data } = await supabase
        .from("artifacts")
        .select("status,processing_token")
        .eq("id", a.id)
        .maybeSingle();
      if (data?.status !== "analyzing") return;
      const token = data.processing_token;
      if (typeof token !== "string" || !token.trim()) return;
      // Do not clear analyze_inflight_at here: a healthy long run heartbeats that field,
      // and the server dedups concurrent invokes. Clearing it would let a duplicate run
      // start and DELETE claims the live run already persisted. If the run is genuinely
      // dead, its heartbeat ages out past the dedup window and this re-invoke proceeds.
      await supabase.functions.invoke("framework-analyze", {
        body: { artifact_id: a.id, processing_token: token },
      });
      await loadStatusOnly();
    })();
  }, [a, elapsed, analyzeStaleSec, loadStatusOnly]);

  useEffect(() => {
    if (!a || a.status !== "analyzing" || !a.raw_text?.trim()) return;
    if (elapsed < analyzeClientTimeoutSec) return;
    if (analyzeClientTimeoutRef.current === a.id) return;
    analyzeClientTimeoutRef.current = a.id;
    void (async () => {
      const { data } = await supabase
        .from("artifacts")
        .select("status")
        .eq("id", a.id)
        .maybeSingle();
      if (data?.status !== "analyzing") return;
      await supabase
        .from("artifacts")
        .update({
          status: "error",
          error: analyzeTimeoutMessage(transcriptLength),
        })
        .eq("id", a.id);
      await loadStatusOnly();
    })();
  }, [a, elapsed, analyzeClientTimeoutSec, transcriptLength, loadStatusOnly]);

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
