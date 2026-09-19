import { useCallback, useEffect, useState } from "react";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { fetchUnifiedMindGraph } from "@/lib/graph/fetchUnifiedMindGraph";
import type { UnifiedMindGraphInput } from "@/lib/graph/unifiedMindGraph";

/** Keep account/vault changes from showing even one frame of a prior user's graph. */
export function useMindGraphData(userId: string | undefined, journalId: string | null) {
  const dek = useJournalVaultStore((state) => state.dek);
  const locking = useJournalVaultStore((state) => state.locking);
  const epoch = useJournalVaultStore((state) => state.lockEpoch);
  const encrypted = useJournalVaultStore((state) => state.e2eEnabled);
  const required = useJournalVaultStore((state) => state.e2eRequiredJournalIds);
  const blocked = locking || (!dek && (encrypted || Boolean(journalId && required.has(journalId))));
  const owner = `${userId ?? ""}:${journalId ?? "all"}:${epoch}`;
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ owner: string; dek: CryptoKey | null; data: UnifiedMindGraphInput | null; error: boolean } | null>(null);
  const retry = useCallback(() => setReload((value) => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    setState(null);
    if (!userId || blocked) return;
    void fetchUnifiedMindGraph(userId, { journalId }).then((data) => {
      if (!cancelled) setState({ owner, dek, data, error: false });
    }, () => {
      if (!cancelled) setState({ owner, dek, data: null, error: true });
    });
    return () => { cancelled = true; };
  }, [userId, journalId, owner, dek, blocked, reload]);
  const current = !blocked && userId && state?.owner === owner && state.dek === dek ? state : null;
  return { raw: current?.data ?? null, busy: Boolean(userId && !blocked && !current), error: current?.error ?? false, blocked, retry,
    sessionKey: `${owner}:${dek ? "unlocked" : "plain"}` };
}
