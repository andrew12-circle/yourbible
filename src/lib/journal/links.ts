import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type LinkKind =
  | "verse"
  | "belief"
  | "tension"
  | "study"
  | "daily"
  | "chat_thread"
  | "artifact"
  | "prompt";

export interface EntryLinkInput {
  kind: LinkKind;
  ref: Json;
}

export interface EntryLink {
  id: string;
  entry_id: string;
  target_kind: LinkKind;
  target_ref: Json;
  created_at: string;
}

/** Replace all links for an entry with the supplied set. */
export async function setEntryLinks(
  userId: string,
  entryId: string,
  links: EntryLinkInput[],
) {
  await supabase.from("journal_entry_links").delete().eq("entry_id", entryId);
  if (!links.length) return;
  await supabase.from("journal_entry_links").insert(
    links.map((l) => ({
      user_id: userId,
      entry_id: entryId,
      target_kind: l.kind,
      target_ref: l.ref,
    })),
  );
}

export async function listEntryLinks(entryId: string): Promise<EntryLink[]> {
  const { data } = await supabase
    .from("journal_entry_links")
    .select("*")
    .eq("entry_id", entryId);
  return (data as EntryLink[]) ?? [];
}

/** Find entries linked to a given target. Useful for Belief / Verse pages. */
export async function findEntriesLinkedTo(
  kind: LinkKind,
  refMatch: Record<string, unknown>,
): Promise<string[]> {
  const { data } = await supabase
    .from("journal_entry_links")
    .select("entry_id")
    .eq("target_kind", kind)
    .contains("target_ref", refMatch as never);
  return (data ?? []).map((r: { entry_id: string }) => r.entry_id);
}

/** `localStorage` handoff when opening full journal editor from the floating panel. */
export const JOURNAL_EXPAND_HANDOFF_KEY = "yb_journal_expand_handoff_v1";

export type JournalExpandHandoffPayload = {
  title: string | null;
  body: string;
  tags?: string[];
};