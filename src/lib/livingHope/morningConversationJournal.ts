import { supabase } from "@/integrations/supabase/client";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { localDateISO } from "@/lib/lifePriorities";
import { getCurrentContext } from "@/lib/journal/context";

export const MORNING_CONVERSATION_ENTRY_KIND = "morning_conversation";
export const MORNING_CONVERSATION_TAG_PREFIX = "lh-conversation:";

export function morningConversationTag(reviewDate: string): string {
  return `${MORNING_CONVERSATION_TAG_PREFIX}${reviewDate}`;
}

export function conversationEntryTitle(reviewDate: string): string {
  const [y, m, d] = reviewDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const label = dt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return `Morning conversation · ${label}`;
}

export const MORNING_CONVERSATION_BODY_TEMPLATE = `## What's on my heart

Talk, type, dictate, sketch, or add photos and video — whatever is honest today.

## Listening

**Ask:** God, what do you want me to know today?

**Then listen.** Don't rush. Write what you hear when you're ready:

`;

export async function findMorningConversationEntry(
  userId: string,
  reviewDate = localDateISO(),
): Promise<string | null> {
  const tag = morningConversationTag(reviewDate);
  const { data } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_kind", MORNING_CONVERSATION_ENTRY_KIND)
    .contains("tags", [tag])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Get or create today's in-flow conversation journal entry. */
export async function getOrCreateMorningConversationEntry(
  userId: string,
  reviewDate = localDateISO(),
): Promise<{ entryId: string; created: boolean }> {
  const existingId = await findMorningConversationEntry(userId, reviewDate);
  if (existingId) return { entryId: existingId, created: false };

  const journalId = await getDefaultJournalId(userId);
  const ctx = await getCurrentContext().catch(() => ({} as Record<string, never>));
  const now = new Date();
  const tag = morningConversationTag(reviewDate);
  const title = conversationEntryTitle(reviewDate);

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      journal_id: journalId,
      title,
      body: MORNING_CONVERSATION_BODY_TEMPLATE,
      summary: "Morning formula conversation",
      entry_kind: MORNING_CONVERSATION_ENTRY_KIND,
      entry_at: reviewDate,
      entry_at_ts: now.toISOString(),
      tags: [tag, "living-hope", "morning-formula", "conversation"],
      analyze_for_mirror: true,
      location_name: ctx.location_name ?? null,
      lat: ctx.lat ?? null,
      lng: ctx.lng ?? null,
      weather: ctx.weather ?? null,
      weather_temp_c: ctx.weather_temp_c ?? null,
      weather_icon: ctx.weather_icon ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Couldn't create conversation entry");
  return { entryId: data.id, created: true };
}

export async function fetchConversationEntryPreview(entryId: string): Promise<{
  title: string | null;
  excerpt: string;
} | null> {
  const { data } = await supabase
    .from("journal_entries")
    .select("title, body, summary")
    .eq("id", entryId)
    .maybeSingle();
  if (!data) return null;
  const raw = String(data.body ?? data.summary ?? "").trim();
  const excerpt = raw.replace(/^#+\s.+$/gm, "").replace(/\*\*/g, "").trim().slice(0, 180);
  return { title: data.title, excerpt };
}
