import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { decryptJournalListRow } from "@/lib/journal/journalEntryCrypto";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";

export const NOTES_LIST_PAGE_SIZE = 80;

const NOTES_COLUMNS_BASE =
  "id,title,body,summary,entry_at_ts,updated_at,pinned,journal_id";

const NOTES_COLUMNS = `${NOTES_COLUMNS_BASE},e2e_encrypted`;

export type NotesListRow = {
  id: string;
  title: string | null;
  body: string;
  summary: string | null;
  entry_at_ts: string;
  updated_at: string;
  pinned: boolean;
  journal_id: string | null;
  e2e_encrypted?: boolean;
  contentLocked?: boolean;
};

type Client = SupabaseClient<Database>;

export async function fetchNotesListPage(
  supabase: Client,
  notesJournalId: string,
  opts?: { offset?: number; limit?: number; search?: string },
): Promise<{ rows: NotesListRow[]; hasMore: boolean }> {
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? NOTES_LIST_PAGE_SIZE;
  const search = opts?.search?.trim();

  const run = (columns: string) => {
    let query = supabase
      .from("journal_entries")
      .select(columns)
      .eq("journal_id", notesJournalId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const escaped = search.replace(/[%_\\]/g, "\\$&");
      query = query.or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`);
    }
    return query;
  };

  let result = await run(NOTES_COLUMNS);
  if (result.error && isJournalE2eSchemaError(result.error)) {
    result = await run(NOTES_COLUMNS_BASE);
  }

  const { data, error } = result;
  if (error) throw error;
  const raw = (data as NotesListRow[]) ?? [];
  const rows = await Promise.all(raw.map((row) => decryptJournalListRow(row)));
  return { rows, hasMore: raw.length >= limit };
}
