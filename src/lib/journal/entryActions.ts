import { supabase } from "@/integrations/supabase/client";

export async function deleteJournalEntry(entryId: string, userId: string) {
  return supabase.from("journal_entries").delete().eq("id", entryId).eq("user_id", userId);
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
