import { deleteJournalDocument } from "./journalDocuments";
import { supabase } from "@/integrations/supabase/client";

export async function deleteJournalEntry(entryId: string, userId: string) {
  try { await deleteJournalDocument(userId, entryId); return { error: null }; }
  catch (error) { return { error: error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)) }; }
}

export async function setJournalEntryPinned(
  entryId: string,
  userId: string,
  pinned: boolean,
) {
  return supabase
    .from("journal_entries")
    .update({ pinned })
    .eq("id", entryId)
    .eq("user_id", userId);
}

export async function setJournalEntryMirrorFlag(
  entryId: string,
  userId: string,
  analyze_for_mirror: boolean,
) {
  return supabase
    .from("journal_entries")
    .update({ analyze_for_mirror })
    .eq("id", entryId)
    .eq("user_id", userId);
}
