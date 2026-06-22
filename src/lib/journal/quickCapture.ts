import { supabase } from "@/integrations/supabase/client";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import { journalNewEntryEditHref } from "@/lib/journal/entryNavigation";

/** Create a blank entry in the default journal and return its edit URL. */
export async function createQuickJournalCaptureUrl(userId: string): Promise<string | null> {
  const journalId = await getDefaultJournalId(userId);
  if (!journalId) return null;

  const ctx = await getCurrentContext().catch(() => ({} as Record<string, never>));
  const now = new Date();

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      journal_id: journalId,
      title: null,
      body: "",
      entry_at: now.toISOString().slice(0, 10),
      entry_at_ts: now.toISOString(),
      ...ctx,
    })
    .select("id")
    .single();

  if (error || !data?.id) return null;
  return journalNewEntryEditHref(data.id);
}
