import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { decodeJournalDraft, listJournalDrafts, JOURNAL_DRAFT_CHANGED } from "@/lib/journal/journalDraftStorage";
import { isLocalOnlyJournalDraft, openJournalDocument, retryJournalDocuments } from "@/lib/journal/journalDocuments";

/** Recovery runs only in the authenticated foreground app, never under another account. */
export function JournalDraftRecovery() {
  const { user } = useAuth();
  const location = useLocation();
  const unlocked = useJournalVaultStore((state) => Boolean(state.dek));
  const [entries, setEntries] = useState<{ id: string; beStill: boolean; locked: boolean }[]>([]);
  useEffect(() => {
    setEntries([]);
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
        const seen = new Set<string>();
        const recovered: { id: string; beStill: boolean; locked: boolean }[] = [];
        let beStillPointer: string | null = null;
        try { beStillPointer = localStorage.getItem(`yb_be_still_active_v1:${userId}`); } catch { /* A pointer contains no journal text. */ }
        for (const row of rows) {
          if (seen.has(row.entryId)) continue;
          seen.add(row.entryId);
          let beStill = row.entryId === beStillPointer;
          if (!row.encrypted || unlocked) {
            try {
              const draft = await decodeJournalDraft(row, userId);
              beStill = isLocalOnlyJournalDraft({ ...draft.base.values, ...draft.pending });
            } catch { /* Keep inaccessible drafts available for recovery after unlocking. */ }
          }
          recovered.push({ id: row.entryId, beStill, locked: row.encrypted && !unlocked });
        }
        if (cancelled) return;
        setEntries(recovered);
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
  if (!user || !entries.length || !/^\/journal(?:\/j\/[^/]+)?\/?$/.test(location.pathname)) return null;
  return (
    <aside className="border-b bg-muted px-4 py-2 text-sm" aria-label="Recoverable journal drafts">
      <p className="font-medium">{entries.length} journal {entries.length === 1 ? "entry has" : "entries have"} local changes to finish saving.</p>
      <div className="flex flex-wrap gap-3">
        {entries.slice(0, 5).map(({ id, beStill, locked }, index) => <Link className="underline" key={id}
          to={beStill ? `/prayer/be-still?session=${encodeURIComponent(id)}` : locked ? "/settings?section=privacy" : `/journal/${id}/edit`}>
          {beStill ? "Resume Be Still" : locked ? "Unlock journal to recover" : `Review draft ${index + 1}`}
        </Link>)}
      </div>
    </aside>
  );
}
