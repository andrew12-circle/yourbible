import { supabase } from "@/integrations/supabase/client";
import { fetchJournalEntryDetail } from "@/lib/journal/journalEntryDb";
import { openJournalDocument } from "@/lib/journal/journalDocuments";
import { parseBeStillSession, withBeStillVerification, type BeStillSession, type BeStillVerification } from "@/lib/prayer/beStill";

const PAGE_SIZE = 24;

async function assertOwner(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user.id !== userId) throw new Error("Sign in to the account that owns this receiving ledger.");
}

export type BeStillLedgerPageData = { sessions: BeStillSession[]; nextOffset: number; hasMore: boolean };

/** The journal is the durable ledger. No public table, duplicated plaintext or additional schema is needed. */
export async function listBeStillLedger(userId: string, offset = 0): Promise<BeStillLedgerPageData> {
  await assertOwner(userId);
  const { data, error } = await supabase.from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .contains("tags", ["be-still"])
    .order("entry_at_ts", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  if (error) throw error;
  await assertOwner(userId);
  const rows = data ?? [];
  const sessions = await Promise.all(rows.slice(0, PAGE_SIZE).map(async ({ id }) => {
    const row = await fetchJournalEntryDetail(id, userId);
    if (row?.contentLocked) throw new Error("Unlock your journal to read the receiving ledger.");
    const session = row ? parseBeStillSession(row.body) : null;
    if (!session || session.id !== id || !session.completedAt) return null;
    return session;
  }));
  await assertOwner(userId);
  return { sessions: sessions.filter((session): session is BeStillSession => Boolean(session)),
    nextOffset: offset + Math.min(rows.length, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

/** A review changes the same journal entry; its existing notes and stable identity are preserved. */
export async function reviewBeStillLedgerEntry(
  userId: string, entryId: string, verification: BeStillVerification, notes: string,
): Promise<BeStillSession> {
  await assertOwner(userId);
  const queue = await openJournalDocument(userId, entryId);
  await assertOwner(userId);
  const current = queue.current();
  if (current.userId !== userId || current.id !== entryId) throw new Error("This ledger entry belongs to another account.");
  const body = String(current.values.body ?? "");
  const updated = withBeStillVerification(body, verification, notes, new Date().toISOString());
  queue.patch({ body: updated });
  const saved = await queue.flush();
  if (!saved.ok) throw saved.error;
  const session = parseBeStillSession(String(saved.snapshot.values.body ?? ""));
  if (!session || session.id !== entryId) throw new Error("The journal did not confirm the ledger review.");
  return session;
}
