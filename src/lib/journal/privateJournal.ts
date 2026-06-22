import { supabase } from "@/integrations/supabase/client";
import type { Journal } from "@/lib/journal/journals";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";

export const PRIVATE_JOURNAL_NAME = "Private";
export const PRIVATE_SOURCE_KIND = "private";
export const PRIVATE_SOURCE_REF = "default";

/** Idempotent — creates the always-encrypted private notebook when schema supports it. */
export async function ensurePrivateJournal(userId: string): Promise<Journal | null> {
  try {
    const { data: existing } = await supabase
      .from("journals")
      .select("*")
      .eq("user_id", userId)
      .eq("source_kind", PRIVATE_SOURCE_KIND)
      .eq("source_ref", PRIVATE_SOURCE_REF)
      .maybeSingle();

    if (existing) return existing as Journal;

    const { data: created, error } = await supabase
      .from("journals")
      .insert({
        user_id: userId,
        name: PRIVATE_JOURNAL_NAME,
        color: "215 16% 47%",
        icon: "lock",
        sort_order: -1,
        is_default: false,
        source_kind: PRIVATE_SOURCE_KIND,
        source_ref: PRIVATE_SOURCE_REF,
        e2e_required: true,
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

export async function loadE2eRequiredJournalIds(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("journals")
      .select("id")
      .eq("user_id", userId)
      .eq("e2e_required", true);
    if (error) {
      if (isJournalE2eSchemaError(error)) return new Set();
      throw error;
    }
    return new Set((data ?? []).map((row) => row.id));
  } catch (e) {
    if (isJournalE2eSchemaError(e)) return new Set();
    throw e;
  }
}
export function isPrivateJournal(journal: Pick<Journal, "source_kind" | "e2e_required">): boolean {
  return journal.e2e_required || journal.source_kind === PRIVATE_SOURCE_KIND;
}
