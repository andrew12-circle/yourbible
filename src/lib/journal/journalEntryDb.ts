import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { decryptJournalRow, encryptJournalPayload } from "@/lib/journal/journalEntryCrypto";
import { JournalConflictError } from "@/lib/journal/journalSaveQueue";

export type JournalEntryRecord = Database["public"]["Tables"]["journal_entries"]["Row"] & { contentLocked?: boolean };
export const JOURNAL_ENTRY_DETAIL_SELECT = "*";
const TEXT_FIELDS = ["title", "body", "summary"] as const;
const WRITE_FIELDS = new Set([
  ...TEXT_FIELDS, "mood", "tags", "entry_at_ts", "entry_at", "pinned", "analyze_for_mirror",
  "journal_id", "location_name", "weather", "weather_temp_c", "weather_icon", "entry_kind",
  "lat", "lng", "verse_ref", "belief_id", "prompt_id",
]);

function cleanPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key, value]) => WRITE_FIELDS.has(key) && value !== undefined));
}

/** Verify policy from the authenticated database, not an initially empty UI cache. */
export async function journalEncryptionRequired(userId: string, journalId: string | null): Promise<boolean> {
  const { data: profile, error } = await supabase.from("profiles")
    .select("journal_e2e_enabled").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (profile?.journal_e2e_enabled) return true;
  if (!journalId) return false;
  const { data: journal, error: journalError } = await supabase.from("journals")
    .select("e2e_required").eq("id", journalId).eq("user_id", userId).maybeSingle();
  if (journalError) throw journalError;
  if (!journal) throw new Error("This notebook could not be found.");
  return Boolean(journal.e2e_required);
}

export async function fetchJournalEntryDetail(id: string, userId?: string): Promise<JournalEntryRecord | null> {
  let query = supabase.from("journal_entries").select("*").eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!Number.isSafeInteger(data.revision)) throw new Error("Journal revision support is unavailable. Saving is paused to protect your entry.");
  return decryptJournalRow(data);
}

export async function updateJournalEntry(
  userId: string,
  id: string,
  payload: Record<string, unknown>,
  opts?: { journalId?: string | null; expectedRevision?: number },
): Promise<{ data: JournalEntryRecord | null; error: Error | null }> {
  try {
    if (!Number.isSafeInteger(opts?.expectedRevision)) throw new JournalConflictError("Reload this entry before saving; its original revision is required.");
    const { data: raw, error: readError } = await supabase.from("journal_entries")
      .select("*").eq("id", id).eq("user_id", userId).maybeSingle();
    if (readError) throw readError;
    if (!raw) throw new Error("This entry no longer exists. Your local changes have been kept.");
    if (raw.revision !== opts!.expectedRevision) throw new JournalConflictError();
    const patch = cleanPayload(payload);
    const journalId = "journal_id" in patch ? patch.journal_id as string | null : raw.journal_id;
    const required = raw.e2e_encrypted || await journalEncryptionRequired(userId, journalId);
    const changesText = TEXT_FIELDS.some((field) => field in patch);
    let encoded = patch;
    if (required && (changesText || !raw.e2e_encrypted)) {
      // Conversion must encrypt every text field, not flag a title-only patch as a fully encrypted row.
      const row = await decryptJournalRow(raw);
      if (row.contentLocked) throw new Error("Unlock your journal before editing this entry.");
      encoded = await encryptJournalPayload({ title: row.title, body: row.body, summary: row.summary, ...patch });
    }
    const { data, error } = await supabase.from("journal_entries").update(encoded)
      .eq("id", id).eq("user_id", userId).eq("revision", opts!.expectedRevision!)
      .select("*").maybeSingle();
    if (error) throw error;
    if (!data) throw new JournalConflictError();
    return { data: await decryptJournalRow(data), error: null };
  } catch (cause) {
    return { data: null, error: cause instanceof Error ? cause : Object.assign(new Error(String((cause as { message?: string })?.message ?? cause)), cause) };
  }
}

export async function insertJournalEntry(userId: string, payload: Record<string, unknown>) {
  const patch = cleanPayload(payload);
  const journalId = typeof patch.journal_id === "string" ? patch.journal_id : null;
  const required = await journalEncryptionRequired(userId, journalId);
  const encoded = required
    ? await encryptJournalPayload({ title: null, body: "", summary: null, ...patch })
    : patch;
  return supabase.from("journal_entries").insert({
    ...encoded, user_id: userId,
    ...(typeof payload.id === "string" ? { id: payload.id } : {}),
  }).select("*").maybeSingle();
}
