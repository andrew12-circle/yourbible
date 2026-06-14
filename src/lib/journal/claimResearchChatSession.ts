import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getCurrentContext } from "@/lib/journal/context";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { normalizeChatSessionTitle } from "@/lib/myai/chatTitle";

export function claimResearchEntryTag(claimId: string): string {
  return `claim-research:${claimId}`;
}

export type ClaimResearchChatSession = {
  entryId: string;
  chatId: string;
};

export async function findClaimResearchChatSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  claimId: string,
): Promise<ClaimResearchChatSession | null> {
  const tag = claimResearchEntryTag(claimId);
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .contains("tags", [tag])
    .eq("entry_kind", "chat")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing?.id) return null;

  const { data: chatRow } = await supabase
    .from("my_ai_chats")
    .select("id")
    .eq("journal_entry_id", existing.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!chatRow?.id) return null;
  return { entryId: existing.id as string, chatId: chatRow.id as string };
}

export async function ensureClaimResearchChatSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  artifactId: string,
  claimId: string,
  title: string,
): Promise<ClaimResearchChatSession> {
  const existing = await findClaimResearchChatSession(supabase, userId, claimId);
  if (existing) return existing;

  const jid = await getDefaultJournalId(userId);
  const ctx = await getCurrentContext().catch(() => ({} as Record<string, unknown>));
  const now = new Date();
  const tag = claimResearchEntryTag(claimId);
  const sessionTitle = normalizeChatSessionTitle(title.trim()) || "Claim research";

  const { data: ent, error: eErr } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      journal_id: jid,
      title: sessionTitle,
      body: "",
      tags: [tag],
      entry_kind: "chat",
      analyze_for_mirror: false,
      entry_at_ts: now.toISOString(),
      entry_at: now.toISOString().slice(0, 10),
      location_name: (ctx.location_name as string | undefined) ?? null,
      lat: (ctx.lat as number | undefined) ?? null,
      lng: (ctx.lng as number | undefined) ?? null,
      weather: (ctx.weather as string | undefined) ?? null,
      weather_temp_c: (ctx.weather_temp_c as number | undefined) ?? null,
      weather_icon: (ctx.weather_icon as string | undefined) ?? null,
    })
    .select("id")
    .maybeSingle();
  if (eErr || !ent?.id) throw new Error(eErr?.message ?? "Could not create chat journal entry");

  const { data: chat, error: cErr } = await supabase
    .from("my_ai_chats")
    .insert({ user_id: userId, journal_entry_id: ent.id })
    .select("id")
    .maybeSingle();
  if (cErr || !chat?.id) throw new Error(cErr?.message ?? "Could not create chat thread");

  await supabase.from("journal_entry_links").insert({
    user_id: userId,
    entry_id: ent.id,
    target_kind: "artifact",
    target_ref: { id: artifactId },
  });

  return { entryId: ent.id as string, chatId: chat.id as string };
}
