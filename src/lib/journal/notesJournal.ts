import { supabase } from "@/integrations/supabase/client";
import type { Journal } from "@/lib/journal/journals";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";

export const NOTES_JOURNAL_NAME = "Notes";
export const NOTES_SOURCE_KIND = "notes";
export const NOTES_SOURCE_REF = "default";

/** Idempotent — creates the quick-capture Notes notebook (Apple Notes-style). */
export async function ensureNotesJournal(userId: string): Promise<Journal | null> {
  try {
    const { data: existing } = await supabase
      .from("journals")
      .select("*")
      .eq("user_id", userId)
      .eq("source_kind", NOTES_SOURCE_KIND)
      .eq("source_ref", NOTES_SOURCE_REF)
      .maybeSingle();

    if (existing) return existing as Journal;

    const { data: created, error } = await supabase
      .from("journals")
      .insert({
        user_id: userId,
        name: NOTES_JOURNAL_NAME,
        color: "48 96% 53%",
        icon: "sticky-note",
        sort_order: -2,
        is_default: false,
        source_kind: NOTES_SOURCE_KIND,
        source_ref: NOTES_SOURCE_REF,
        e2e_required: false,
      })
      .select("*")
      .maybeSingle();

    if (error) {
      if (isJournalE2eSchemaError(error)) return null;
      throw error;
    }
    return (created as Journal) ?? null;
  } catch (e) {
    if (isJournalE2eSchemaError(e)) return null;
    throw e;
  }
}

export async function getNotesJournalId(userId: string): Promise<string | null> {
  const journal = await ensureNotesJournal(userId);
  return journal?.id ?? null;
}

export function isNotesJournal(journal: Pick<Journal, "source_kind">): boolean {
  return journal.source_kind === NOTES_SOURCE_KIND;
}

/** Personal journal list — hide system notebooks shown elsewhere in the rail. */
export function filterPersonalJournals(journals: Journal[]): Journal[] {
  return journals.filter((j) => !isNotesJournal(j) && j.source_kind !== "private");
}

export async function createNoteEntry(userId: string, notesJournalId: string): Promise<string | null> {
  const now = new Date();
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      journal_id: notesJournalId,
      title: null,
      body: "",
      tags: [],
      entry_at_ts: now.toISOString(),
      entry_at: now.toISOString().slice(0, 10),
      analyze_for_mirror: false,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}
