import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fetchJournalEntryListPage, type JournalEntryListRow } from "./entryListQuery";

export const NOTES_LIST_PAGE_SIZE = 80;
export type NotesListRow = Pick<JournalEntryListRow, "id" | "title" | "body" | "summary" | "entry_at_ts" | "updated_at" | "pinned" | "journal_id" | "e2e_encrypted" | "contentLocked">;

export async function fetchNotesListPage(
  client: SupabaseClient<Database>, notesJournalId: string,
  opts?: { offset?: number; limit?: number; search?: string; signal?: AbortSignal },
): Promise<{ rows: NotesListRow[]; hasMore: boolean }> {
  return fetchJournalEntryListPage(client, {
    ...opts, journalId: notesJournalId, limit: opts?.limit ?? NOTES_LIST_PAGE_SIZE, sortUpdated: true,
  });
}
