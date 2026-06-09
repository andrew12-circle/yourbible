import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  shouldScheduleCorpusStandingRetry,
  summarizeCorpusPeers,
  type CorpusPeerMatch,
} from "@/lib/framework/artifactCorpusStanding";
import {
  attachPeerArtifactTitles,
  loadCorpusPeersForArtifact,
} from "@/lib/framework/fetchCorpusStanding";

type State = {
  peers: CorpusPeerMatch[];
  loading: boolean;
  error: string | null;
  embeddingPending: boolean;
  echoClaimCount: number;
  peerCount: number;
  peerLibraryCount: number;
};

const EMPTY: State = {
  peers: [],
  loading: false,
  error: null,
  embeddingPending: false,
  echoClaimCount: 0,
  peerCount: 0,
  peerLibraryCount: 0,
};

const RETRY_DELAYS_MS = [5000, 12000, 25000, 45000];

type LoadOptions = { background?: boolean };

export function useArtifactCorpusStanding(
  artifactId: string | undefined,
  artifactStatus: string | undefined,
  sourceClaimCount: number,
  userId: string | undefined,
  enabled = true,
) {
  const [state, setState] = useState<State>(EMPTY);
  const retryTimersRef = useRef<number[]>([]);

  const clearRetryTimers = useCallback(() => {
    for (const id of retryTimersRef.current) window.clearTimeout(id);
    retryTimersRef.current = [];
  }, []);

  const load = useCallback(
    async (opts?: LoadOptions) => {
      if (!artifactId || artifactStatus !== "ready" || !enabled || !userId) {
        clearRetryTimers();
        setState(EMPTY);
        return;
      }
      if (!opts?.background) {
        setState((s) => ({ ...s, loading: true, error: null }));
      }

      const result = await loadCorpusPeersForArtifact(supabase, userId, artifactId);
      if (result.error) {
        clearRetryTimers();
        setState({ ...EMPTY, loading: false, error: result.error });
        return;
      }

      const peers = await attachPeerArtifactTitles(supabase, result.peers);
      const summary = summarizeCorpusPeers(peers, sourceClaimCount);
      setState({
        peers,
        loading: false,
        error: null,
        embeddingPending: result.embeddingPending,
        echoClaimCount: summary.echoClaimCount,
        peerCount: summary.peerCount,
        peerLibraryCount: result.peerLibraryCount,
      });
    },
    [artifactId, artifactStatus, clearRetryTimers, enabled, sourceClaimCount, userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    clearRetryTimers();
    if (!artifactId || artifactStatus !== "ready" || !enabled || !userId) return;
    if (!shouldScheduleCorpusStandingRetry(state, sourceClaimCount)) return;

    retryTimersRef.current = RETRY_DELAYS_MS.map((delay) =>
      window.setTimeout(() => {
        void load({ background: true });
      }, delay),
    );

    return clearRetryTimers;
  }, [
    artifactId,
    artifactStatus,
    clearRetryTimers,
    enabled,
    load,
    sourceClaimCount,
    state.embeddingPending,
    state.error,
    state.loading,
    userId,
  ]);

  return { ...state, reload: () => load() };
}
