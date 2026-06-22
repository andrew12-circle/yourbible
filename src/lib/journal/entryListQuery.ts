import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { JournalEntryKind } from "@/lib/journal/entryKinds";
import { decryptJournalListRow } from "@/lib/journal/journalEntryCrypto";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";

export const JOURNAL_LIST_PAGE_SIZE = 100;

const JOURNAL_ENTRY_LIST_COLUMNS_BASE =
  "id,title,body,summary,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,journal_id,entry_kind";

export const JOURNAL_ENTRY_LIST_COLUMNS = `${JOURNAL_ENTRY_LIST_COLUMNS_BASE},e2e_encrypted`;

export type JournalEntryListRow = {
  id: string;
  title: string | null;
  body: string;
  summary: string | null;
  entry_at_ts: string;
  mood: number | null;
  location_name: string | null;
  weather: string | null;
  weather_temp_c: number | null;
  weather_icon: string | null;
  pinned: boolean;
  analyze_for_mirror: boolean;
  journal_id: string | null;
  entry_kind: string | null;
  e2e_encrypted?: boolean;
  contentLocked?: boolean;
};

type Client = SupabaseClient<Database>;

async function runJournalListQuery(
  supabase: Client,
  opts: {
    journalId?: string | null;
    entryKindFilter?: JournalEntryKind | null;
    excludeJournalIds?: string[];
    offset: number;
    limit: number;
  },
  columns: string,
) {
  let query = supabase
    .from("journal_entries")
    .select(columns)
    .order("pinned", { ascending: false })
    .order("entry_at_ts", { ascending: false })
    .range(opts.offset, opts.offset + opts.limit - 1);

  if (opts.journalId) query = query.eq("journal_id", opts.journalId);
  for (const jid of opts.excludeJournalIds ?? []) {
    query = query.neq("journal_id", jid);
  }
  if (opts.entryKindFilter) {
    query = query.eq("entry_kind", opts.entryKindFilter);
  } else {
    query = query.or("entry_kind.is.null,entry_kind.neq.vent");
  }

  return query;
}

export async function fetchJournalEntryListPage(
  supabase: Client,
  opts: {
    journalId?: string | null;
    entryKindFilter?: JournalEntryKind | null;
    excludeJournalIds?: string[];
    offset?: number;
    limit?: number;
  },
): Promise<{ rows: JournalEntryListRow[]; hasMore: boolean }> {
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? JOURNAL_LIST_PAGE_SIZE;
  const queryOpts = { ...opts, offset, limit };

  let result = await runJournalListQuery(supabase, queryOpts, JOURNAL_ENTRY_LIST_COLUMNS);
  if (result.error && isJournalE2eSchemaError(result.error)) {
    result = await runJournalListQuery(supabase, queryOpts, JOURNAL_ENTRY_LIST_COLUMNS_BASE);
  }

  const { data, error } = result;
  if (error) throw error;
  const raw = (data as JournalEntryListRow[]) ?? [];
  const rows = await Promise.all(raw.map((row) => decryptJournalListRow(row)));
  return { rows, hasMore: raw.length >= limit };
}
