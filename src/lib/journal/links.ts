import { supabase } from "@/integrations/supabase/client";

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
  ref: Record<string, unknown>;
}

export interface EntryLink {
  id: string;
  entry_id: string;
  target_kind: LinkKind;
  target_ref: Record<string, unknown>;
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
    .contains("target_ref", refMatch);
  return (data ?? []).map((r: { entry_id: string }) => r.entry_id);
}