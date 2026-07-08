import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

export type JournalReflectionContext = {
  block: string;
  isReflection: boolean;
};

export async function loadJournalReflectionContext(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
): Promise<JournalReflectionContext | null> {
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .select("id,entry_kind,title,summary,body,user_id")
    .eq("id", entryId)
    .maybeSingle();
  if (error || !entry || entry.user_id !== userId) return null;
  if (entry.entry_kind === "chat") {
    return { block: "", isReflection: false };
  }

  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
  const body = typeof entry.body === "string" ? entry.body.trim() : "";
  const bodyExcerpt = body.slice(0, 12_000);

  const block = [
    "## Today's journal entry (what they want to discuss)",
    title ? `Title: ${title}` : "",
    summary ? `Summary: ${summary}` : "",
    bodyExcerpt ? `\n### Entry text\n${bodyExcerpt}` : "",
    `[journal:${entryId}]`,
  ].filter(Boolean).join("\n");

  return { block, isReflection: true };
}

export const JOURNAL_REFLECTION_OPENER_SEED =
  "(The user finished a journal entry and opened My AI to talk about what they wrote — see \"Today's journal entry\" below. No user message yet. Write a warm opening: acknowledge what they shared in your own words (do not paste their entry back), offer encouragement or a brief prayer when it fits, connect to their living context when relevant, and invite them to go deeper. End with one gentle question. Keep it concise.)";
