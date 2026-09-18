import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { JOURNAL_ATTACHMENT_CHANGED, listJournalAttachmentOperations, retryJournalAttachmentOperation, discardPendingJournalPhoto, type AttachmentOperation } from "@/lib/journal/journalAttachmentOperations";

/** Failed operations only: normal attachment work does not add saving chrome. */
export function JournalAttachmentRecovery() {
  const { user } = useAuth();
  const locked = useJournalVaultStore((s) => s.locking || (s.e2eEnabled && !s.dek));
  const [state, setState] = useState<{ owner: string; operations: AttachmentOperation[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const operations = await listJournalAttachmentOperations(user.id);
    setState({ owner: user.id, operations: operations.filter((op) => op.error || Date.now() - (op.createdAt ?? 0) > 60_000) });
  }, [user?.id]);
  useEffect(() => {
    const changed = () => { void refresh().catch(() => {}); };
    const timer = setInterval(changed, 60_000);
    changed(); window.addEventListener(JOURNAL_ATTACHMENT_CHANGED, changed);
    return () => { clearInterval(timer); window.removeEventListener(JOURNAL_ATTACHMENT_CHANGED, changed); };
  }, [refresh]);
  const operations = state?.owner === user?.id ? state?.operations ?? [] : [];
  if (!operations.length || locked) return null;
  return <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-background p-3 text-sm shadow-lg">
    <p className="font-medium">{operations.length} attachment {operations.length === 1 ? "operation needs" : "operations need"} attention</p>
    <p className="text-xs text-muted-foreground">Uploads are retained on this device. Failed removals remain retryable.</p>
    {error && <p className="text-xs text-destructive">{error}</p>}
    <button type="button" disabled={busy} className="mt-2 underline" onClick={async () => {
      setBusy(true); setError("");
      try { for (const op of operations) await retryJournalAttachmentOperation(op); await refresh();
        window.dispatchEvent(new Event("yourbible:journal-attachments-recovered"));
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Retry failed. Files are retained."); }
      finally { setBusy(false); }
    }}>{busy ? "Retrying…" : "Retry attachments"}</button>
    {operations.some((op) => op.kind === "upload") && <button type="button" disabled={busy} className="ml-3 underline" onClick={async () => {
      if (!window.confirm("Discard failed photo uploads from this device? Confirmed entry attachments will not be removed.")) return;
      setBusy(true);
      try { for (const op of operations.filter((item) => item.kind === "upload")) await discardPendingJournalPhoto(op); await refresh(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Discard failed."); }
      finally { setBusy(false); }
    }}>Discard failed uploads</button>}
  </div>;
}
