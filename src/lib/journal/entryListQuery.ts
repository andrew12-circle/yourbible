import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { JournalEntryKind } from "./entryKinds";
import { decryptJournalListRow } from "./journalEntryCrypto";
import { getJournalDek } from "@/stores/journalVaultStore";
import { checkJournalReadAbort } from "./journalCollectionRead";

export const JOURNAL_LIST_PAGE_SIZE = 100;
export const JOURNAL_ENTRY_LIST_COLUMNS = "id,title,body,summary,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,journal_id,entry_kind,e2e_encrypted";
export type JournalEntryListRow = Database["public"]["Functions"]["journal_entry_list_page"]["Returns"][number] & { contentLocked?: boolean };
export type JournalListOptions = {
  userId?: string;
  journalId?: string | null;
  entryKindFilter?: JournalEntryKind | null;
  excludeJournalIds?: string[];
  offset?: number;
  limit?: number;
  search?: string;
  sortUpdated?: boolean;
  signal?: AbortSignal;
};

export async function fetchJournalEntryListPage(
  client: SupabaseClient<Database>, opts: JournalListOptions,
): Promise<{ rows: JournalEntryListRow[]; hasMore: boolean }> {
  const { data: auth, error: authError } = await client.auth.getSession();
  if (authError) throw authError;
  const userId = auth.session?.user.id;
  if (!userId || (opts.userId && opts.userId !== userId)) throw new Error("Sign in to load this journal.");
  const key = getJournalDek();
  const search = opts.search?.trim() ?? "";
  const offset = Math.max(0, Math.trunc(opts.offset ?? 0));
  const limit = Math.min(JOURNAL_LIST_PAGE_SIZE, Math.max(1, Math.trunc(opts.limit ?? JOURNAL_LIST_PAGE_SIZE)));
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(limit)) throw new Error("Invalid journal page.");
  const localSearch = Boolean(search && key);
  let scanOffset = localSearch ? 0 : offset;
  const rows: JournalEntryListRow[] = [];
  const seen = new Set<string>();
  for (;;) {
    checkJournalReadAbort(opts.signal);
    let query = client.rpc("journal_entry_list_page", {
      p_journal_id: opts.journalId ?? null,
      p_exclude_journal_ids: opts.excludeJournalIds ?? [],
      p_entry_kind: opts.entryKindFilter ?? null,
      p_search: search || null,
      p_include_encrypted: Boolean(key),
      p_sort_updated: opts.sortUpdated ?? false,
      p_limit: localSearch ? 200 : limit + 1,
      p_offset: scanOffset,
    });
    if (opts.signal) query = query.abortSignal(opts.signal);
    const { data, error } = await query;
    if (error) throw error;
    checkJournalReadAbort(opts.signal);
    const raw = data ?? [];
    for (const row of raw) {
      if (row.user_id !== userId) throw new Error("Journal read returned another account's entry.");
      if (seen.has(row.id)) throw new Error("Journal changed while searching. Please retry.");
      seen.add(row.id);
      const decoded = await decryptJournalListRow(row);
      if (localSearch && row.e2e_encrypted && (decoded.contentLocked || ![decoded.title, decoded.body, decoded.summary, decoded.location_name]
        .some((value) => value?.toLowerCase().includes(search.toLowerCase())))) continue;
      rows.push({ ...decoded, body: decoded.body.slice(0, 512) });
    }
    const { data: afterAuth, error: afterAuthError } = await client.auth.getSession();
    if (afterAuthError) throw afterAuthError;
    if (afterAuth.session?.user.id !== userId || getJournalDek() !== key) throw new Error("Journal access changed while loading. Please retry.");
    checkJournalReadAbort(opts.signal);
    if (!localSearch) return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
    if (!raw.length || rows.length > offset + limit) return { rows: rows.slice(offset, offset + limit), hasMore: rows.length > offset + limit };
    scanOffset += raw.length;
  }
}
