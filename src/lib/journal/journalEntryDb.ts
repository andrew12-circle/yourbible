import { supabase } from "@/integrations/supabase/client";
import { decryptJournalRow, maybeEncryptJournalPayload } from "@/lib/journal/journalEntryCrypto";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";

const JOURNAL_ENTRY_DETAIL_BASE =
  "id,title,body,summary,mood,tags,entry_at_ts,pinned,analyze_for_mirror,journal_id,location_name,weather,weather_temp_c,weather_icon,entry_kind,lat,lng";

export const JOURNAL_ENTRY_DETAIL_SELECT = `${JOURNAL_ENTRY_DETAIL_BASE},e2e_encrypted`;

export async function fetchJournalEntryDetail(id: string) {
  let result = await supabase
    .from("journal_entries")
    .select(JOURNAL_ENTRY_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (result.error && isJournalE2eSchemaError(result.error)) {
    result = await supabase
      .from("journal_entries")
      .select(JOURNAL_ENTRY_DETAIL_BASE)
      .eq("id", id)
      .maybeSingle();
  }

  const { data, error } = result;
  if (error) throw error;
  const row = data as Record<string, unknown> | null;
  if (!row) return null;
  return decryptJournalRow(row as Parameters<typeof decryptJournalRow>[0]);
}

export async function updateJournalEntry(
  userId: string,
  id: string,
  payload: Record<string, unknown>,
  opts?: { journalId?: string | null },
) {
  let journalId = opts?.journalId ?? (typeof payload.journal_id === "string" ? payload.journal_id : null);
  if (journalId == null) {
    const { data } = await supabase
      .from("journal_entries")
      .select("journal_id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    journalId = data?.journal_id ?? null;
  }
  const encrypted = await maybeEncryptJournalPayload(payload, { journalId });
  return supabase.from("journal_entries").update(encrypted).eq("id", id).eq("user_id", userId);
}

export async function insertJournalEntry(userId: string, payload: Record<string, unknown>) {
  const journalId = typeof payload.journal_id === "string" ? payload.journal_id : null;
  const encrypted = await maybeEncryptJournalPayload(payload, { journalId });
  return supabase
    .from("journal_entries")
    .insert({ ...encrypted, user_id: userId })
    .select("id")
    .maybeSingle();
}
