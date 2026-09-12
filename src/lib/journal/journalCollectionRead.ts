import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { decryptJournalListRow, type DecryptedJournalRow } from "./journalEntryCrypto";
import { getJournalDek } from "@/stores/journalVaultStore";

type EntryRow = Database["public"]["Tables"]["journal_entries"]["Row"];
export const JOURNAL_READ_BATCH = 200;

export function checkJournalReadAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Journal read cancelled", "AbortError");
}

export async function requireJournalReadUser(expected?: string): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId || (expected && expected !== userId)) throw new Error("Sign in to the account that owns this journal.");
  return userId;
}

/** Stable ID pagination avoids server row limits and offset drift during deletes. */
export async function collectJournalPages<T extends { id: string }>(
  fetchPage: (afterId: string | null, limit: number) => Promise<T[]>,
  signal?: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  for (;;) {
    checkJournalReadAbort(signal);
    const page = await fetchPage(cursor, JOURNAL_READ_BATCH);
    checkJournalReadAbort(signal);
    if (!page.length) return rows;
    for (const row of page) {
      if (!row.id || (cursor !== null && row.id <= cursor)) throw new Error("Journal pagination did not advance. No partial result was returned.");
      rows.push(row);
      cursor = row.id;
    }
    // Continue until an empty page, even when the project caps rows below our limit.
  }
}

export async function fetchJournalCollection(userId: string, opts: {
  journalId?: string | null;
  locatedOnly?: boolean;
  signal?: AbortSignal;
} = {}): Promise<DecryptedJournalRow<EntryRow>[]> {
  const key = getJournalDek();
  const startedAt = new Date().toISOString();
  return collectJournalPages(async (cursor, limit) => {
    await requireJournalReadUser(userId);
    let query = supabase.from("journal_entries").select("*")
      .eq("user_id", userId).lte("created_at", startedAt)
      .or("entry_kind.is.null,entry_kind.neq.vent")
      .order("id", { ascending: true }).limit(limit);
    if (cursor) query = query.gt("id", cursor);
    if (opts.journalId) query = query.eq("journal_id", opts.journalId);
    if (opts.locatedOnly) query = query.not("lat", "is", null).not("lng", "is", null);
    if (opts.signal) query = query.abortSignal(opts.signal);
    const { data, error } = await query;
    if (error) throw error;
    if (data?.some((row) => row.user_id !== userId)) throw new Error("Journal read returned another account’s entry.");
    const rows = await Promise.all((data ?? []).map(decryptJournalListRow));
    await requireJournalReadUser(userId);
    if (getJournalDek() !== key) throw new Error("Journal privacy changed during loading. Please try again.");
    return rows;
  }, opts.signal);
}
