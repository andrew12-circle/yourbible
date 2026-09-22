import { flushMorningInlineJournals } from "./MorningFormulaInlineJournal";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { refreshJournalDocument } from "@/lib/journal/journalDocuments";
import { requireJournalCloudAi } from "@/lib/journal/journalAiAccess";
import { journalCloudAiAllowed } from "@/lib/journal/journalAiPolicy";
import { generateGuidedMorningPrayers } from "@/lib/livingHope/morningGuidedPrayer";
import { replaceMorningSection, updateMorningFormulaEntry } from "@/lib/livingHope/morningFormulaJournalBody";

export function MorningPrayerHelp({ entryId }: { entryId: string | null }) {
  const { user, profile } = useAuth();
  const locking = useJournalVaultStore((s) => s.locking);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permitted = Boolean(user && profile?.user_id === user.id && !profile?.journal_e2e_enabled && !locking);
  const latest = useRef({ userId: user?.id, entryId, permitted }); latest.current = { userId: user?.id, entryId, permitted };
  const alive = useRef(true);
  useEffect(() => { alive.current = true; setDraft(""); setError(null); return () => { alive.current = false; }; }, [user?.id, entryId, permitted]);
  const run = async (save: boolean) => {
    if (!user || !entryId || !permitted || busy) return;
    const matches = () => alive.current && latest.current.userId === user.id && latest.current.entryId === entryId && latest.current.permitted;
    setBusy(true); setError(null);
    try {
      await requireJournalCloudAi(entryId, user.id);
      if (!matches()) return;
      await flushMorningInlineJournals(user.id, entryId);
      const row = await refreshJournalDocument(user.id, entryId);
      if (!matches()) return;
      if (!journalCloudAiAllowed(row)) throw new Error("Prayer assistance is not enabled for this private entry.");
      if (save) {
        // Keep generated help separate: never replace the user's own heart or video text.
        await updateMorningFormulaEntry(user.id, entryId, (body) => replaceMorningSection(body, "## Prayer help", draft, "## Listening"));
        if (matches()) setDraft("");
      } else {
        const result = await generateGuidedMorningPrayers(user.id, String(row.body ?? ""));
        if (matches()) setDraft(result);
      }
    } catch (cause) { if (matches()) setError(cause instanceof Error ? cause.message : "Prayer help is unavailable. Your journal is unchanged."); }
    finally { if (matches()) setBusy(false); }
  };
  if (!permitted) return null;
  return <details className="border-t border-border/50 pt-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm text-muted-foreground">Help me put this into a prayer</summary>
    <div className="space-y-4 pt-2">
      <p className="text-sm text-muted-foreground">Optional AI assistance based on today's journal. Review and edit before adding it.</p>
      <Button type="button" variant="outline" disabled={!entryId || busy} onClick={() => void run(false)}>{busy ? "Working…" : "Draft a prayer from my journal"}</Button>
      {draft && <><Textarea aria-label="Prayer draft" rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} /><Button disabled={busy || !draft.trim()} onClick={() => void run(true)}>Add prayer to today's journal</Button></>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  </details>;
}
