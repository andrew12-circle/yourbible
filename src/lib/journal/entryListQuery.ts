import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { JournalEntryKind } from "@/lib/journal/entryKinds";

export const JOURNAL_LIST_PAGE_SIZE = 100;

export const JOURNAL_ENTRY_LIST_COLUMNS =
  "id,title,body,summary,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,journal_id,entry_kind";

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
};

type Client = SupabaseClient<Database>;

export async function fetchJournalEntryListPage(
  supabase: Client,
  opts: {
    journalId?: string | null;
    entryKindFilter?: JournalEntryKind | null;
    offset?: number;
    limit?: number;
  },
): Promise<{ rows: JournalEntryListRow[]; hasMore: boolean }> {
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? JOURNAL_LIST_PAGE_SIZE;

  let query = supabase
    .from("journal_entries")
    .select(JOURNAL_ENTRY_LIST_COLUMNS)
    .order("pinned", { ascending: false })
    .order("entry_at_ts", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.journalId) query = query.eq("journal_id", opts.journalId);
  if (opts.entryKindFilter) {
    query = query.eq("entry_kind", opts.entryKindFilter);
  } else {
    query = query.or("entry_kind.is.null,entry_kind.neq.vent");
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data as JournalEntryListRow[]) ?? [];
  return { rows, hasMore: rows.length >= limit };
}
