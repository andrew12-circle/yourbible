import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { listJournalDrafts, JOURNAL_DRAFT_CHANGED } from "@/lib/journal/journalDraftStorage";
import { openJournalDocument, retryJournalDocuments } from "@/lib/journal/journalDocuments";

/** Recovery runs only in the authenticated foreground app, never under another account. */
export function JournalDraftRecovery() {
  const { user } = useAuth();
  const location = useLocation();
  const unlocked = useJournalVaultStore((state) => Boolean(state.dek));
  const [entryIds, setEntryIds] = useState<string[]>([]);
  useEffect(() => {
    setEntryIds([]);
    if (!user?.id) return;
    const userId = user.id;
    let cancelled = false;
    let running = false;
    const refresh = async (retry: boolean) => {
      if (running || cancelled) return;
      running = true;
      try {
        const rows = await listJournalDrafts(userId);
        if (cancelled) return;
        setEntryIds([...new Set(rows.map((row) => row.entryId))]);
        if (!retry || document.visibilityState !== "visible" || !navigator.onLine) return;
        for (const row of rows.slice(0, 5)) {
          if (cancelled) return;
          if (row.encrypted && !unlocked) continue;
          try { await openJournalDocument(userId, row.entryId); } catch { /* Retain inaccessible drafts for explicit recovery. */ }
        }
        if (!cancelled) retryJournalDocuments(userId);
      } catch { /* Editor save status reports a storage failure without claiming a backup. */ }
      finally { running = false; }
    };
    const retry = () => { void refresh(true); };
    const changed = () => { void refresh(false); };
    void refresh(true);
    const timer = setInterval(retry, 30_000);
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    document.addEventListener("visibilitychange", retry);
    window.addEventListener(JOURNAL_DRAFT_CHANGED, changed);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      document.removeEventListener("visibilitychange", retry);
      window.removeEventListener(JOURNAL_DRAFT_CHANGED, changed);
    };
  }, [user?.id, unlocked]);
  if (!user || !entryIds.length || !/^\/journal(?:\/j\/[^/]+)?\/?$/.test(location.pathname)) return null;
  return (
    <aside className="border-b bg-muted px-4 py-2 text-sm" aria-label="Recoverable journal drafts">
      <p className="font-medium">{entryIds.length} journal {entryIds.length === 1 ? "entry has" : "entries have"} local changes to finish saving.</p>
      <div className="flex flex-wrap gap-3">
        {entryIds.slice(0, 5).map((id, index) => <Link className="underline" key={id} to={`/journal/${id}/edit`}>Review draft {index + 1}</Link>)}
      </div>
    </aside>
  );
}
