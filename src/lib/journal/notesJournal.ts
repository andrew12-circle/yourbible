import { supabase } from "@/integrations/supabase/client";
import type { Journal } from "@/lib/journal/journals";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";

export const NOTES_JOURNAL_NAME = "Notes";
export const NOTES_SOURCE_KIND = "notes";
export const NOTES_SOURCE_REF = "default";
/** Pre-migration fallback when `notes` is not yet in source_kind check. */
export const NOTES_LEGACY_SOURCE_KIND = "manual";

function isNotesSourceKindError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  const msg = String((error as { message: unknown }).message);
  return /source_kind|check constraint|journals_source_kind_check/i.test(msg);
}

function isSchemaCompatError(error: unknown): boolean {
  return isJournalE2eSchemaError(error) || isNotesSourceKindError(error);
}

async function selectNotesJournal(userId: string): Promise<Journal | null> {
  const { data: official } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .eq("source_kind", NOTES_SOURCE_KIND)
    .eq("source_ref", NOTES_SOURCE_REF)
    .maybeSingle();
  if (official) return official as Journal;

  const { data: legacy } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .eq("source_kind", NOTES_LEGACY_SOURCE_KIND)
    .eq("source_ref", NOTES_SOURCE_REF)
    .eq("name", NOTES_JOURNAL_NAME)
    .maybeSingle();
  if (legacy) return legacy as Journal;

  const { data: byName } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .eq("name", NOTES_JOURNAL_NAME)
    .eq("icon", "sticky-note")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return (byName as Journal) ?? null;
}

type NotesInsertPayload = {
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_default: boolean;
  source_kind: string;
  source_ref: string;
  e2e_required?: boolean;
};

async function insertNotesJournal(userId: string, payload: NotesInsertPayload) {
  return supabase
    .from("journals")
    .insert({ user_id: userId, ...payload })
    .select("*")
    .maybeSingle();
}

/** Idempotent — creates the quick-capture Notes notebook (Apple Notes-style). */
export async function ensureNotesJournal(userId: string): Promise<Journal | null> {
  try {
    const existing = await selectNotesJournal(userId);
    if (existing) return existing;

    const base: Omit<NotesInsertPayload, "source_kind" | "e2e_required"> = {
      name: NOTES_JOURNAL_NAME,
      color: "48 96% 53%",
      icon: "sticky-note",
      sort_order: -2,
      is_default: false,
      source_ref: NOTES_SOURCE_REF,
    };

    const attempts: NotesInsertPayload[] = [
      { ...base, source_kind: NOTES_SOURCE_KIND, e2e_required: false },
      { ...base, source_kind: NOTES_SOURCE_KIND },
      { ...base, source_kind: NOTES_LEGACY_SOURCE_KIND, e2e_required: false },
      { ...base, source_kind: NOTES_LEGACY_SOURCE_KIND },
    ];

    for (const payload of attempts) {
      const { data: created, error } = await insertNotesJournal(userId, payload);
      if (!error && created) return created as Journal;
      if (error && !isSchemaCompatError(error)) throw error;
    }

    return await selectNotesJournal(userId);
  } catch (e) {
    if (isSchemaCompatError(e)) {
      return await selectNotesJournal(userId);
    }
    throw e;
  }
}

export async function getNotesJournalId(userId: string): Promise<string | null> {
  const journal = await ensureNotesJournal(userId);
  return journal?.id ?? null;
}

export function isNotesJournal(
  journal: Pick<Journal, "source_kind" | "source_ref" | "name" | "icon">,
): boolean {
  if (journal.source_kind === NOTES_SOURCE_KIND) return true;
  return (
    journal.source_kind === NOTES_LEGACY_SOURCE_KIND &&
    journal.source_ref === NOTES_SOURCE_REF &&
    journal.name === NOTES_JOURNAL_NAME &&
    journal.icon === "sticky-note"
  );
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
