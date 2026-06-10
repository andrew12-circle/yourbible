import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { parseWikilinks, resolveWikilinksToEntryIds } from "@/lib/journal/wikilinks";

export type LinkKind =
  | "verse"
  | "belief"
  | "tension"
  | "study"
  | "daily"
  | "chat_thread"
  | "artifact"
  | "prompt"
  | "entry";

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

export interface EntryBacklink {
  id: string;
  source_entry_id: string;
  source_title: string | null;
  source_entry_at_ts: string | null;
  created_at: string;
}

/** Entries that link *to* this entry via `[[wikilinks]]`. */
export async function listEntryBacklinks(entryId: string): Promise<EntryBacklink[]> {
  const { data: links } = await supabase
    .from("journal_entry_links")
    .select("id, entry_id, created_at")
    .eq("target_kind", "entry")
    .contains("target_ref", { entry_id: entryId } as never);
  if (!links?.length) return [];

  const sourceIds = [...new Set(links.map((l) => l.entry_id))];
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, title, entry_at_ts")
    .in("id", sourceIds);
  const byId = new Map(
    (entries ?? []).map((e) => [e.id, e as { id: string; title: string | null; entry_at_ts: string }]),
  );

  return links.map((l) => {
    const src = byId.get(l.entry_id);
    return {
      id: l.id,
      source_entry_id: l.entry_id,
      source_title: src?.title ?? null,
      source_entry_at_ts: src?.entry_at_ts ?? null,
      created_at: l.created_at,
    };
  });
}

/** Outgoing entry-to-entry links only. */
export async function listOutgoingEntryLinks(entryId: string): Promise<EntryLink[]> {
  const all = await listEntryLinks(entryId);
  return all.filter((l) => l.target_kind === "entry");
}

/**
 * Parse `[[wikilinks]]` in body and sync outgoing entry links.
 * Other link kinds (verse, belief, etc.) are left untouched.
 */
export async function syncEntryWikilinks(
  userId: string,
  entryId: string,
  body: string,
): Promise<{ linked: number; error?: string }> {
  const parsed = parseWikilinks(body);
  const { data: titles, error: titleErr } = await supabase
    .from("journal_entries")
    .select("id, title")
    .eq("user_id", userId)
    .or("entry_kind.is.null,entry_kind.neq.vent");
  if (titleErr) return { linked: 0, error: titleErr.message };

  const targetIds = resolveWikilinksToEntryIds(parsed, entryId, titles ?? []);

  const { error: delErr } = await supabase
    .from("journal_entry_links")
    .delete()
    .eq("entry_id", entryId)
    .eq("target_kind", "entry");
  if (delErr) return { linked: 0, error: delErr.message };

  if (!targetIds.length) return { linked: 0 };

  const { error: insErr } = await supabase.from("journal_entry_links").insert(
    targetIds.map((tid) => ({
      user_id: userId,
      entry_id: entryId,
      target_kind: "entry" as const,
      target_ref: { entry_id: tid } as Json,
    })),
  );
  if (insErr) return { linked: 0, error: insErr.message };
  return { linked: targetIds.length };
}

/** `localStorage` handoff when opening full journal editor from the floating panel. */
export const JOURNAL_EXPAND_HANDOFF_KEY = "yb_journal_expand_handoff_v1";

export type JournalExpandHandoffPayload = {
  title: string | null;
  body: string;
  tags?: string[];
  /** When set, back from the full editor returns here (e.g. artifact journal tab). */
  returnTo?: string;
};