import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

export type JournalReflectionContext = {
  block: string;
  isReflection: boolean;
  hasEntryText: boolean;
};

export type JournalReflectionEntrySnapshot = {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
};

function trimField(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function hasMeaningfulJournalReflectionText(
  snapshot: JournalReflectionEntrySnapshot,
): boolean {
  return Boolean(trimField(snapshot.title) || trimField(snapshot.summary) || trimField(snapshot.body));
}

export function buildJournalReflectionBlock(
  entryId: string,
  snapshot: JournalReflectionEntrySnapshot,
): { block: string; hasEntryText: boolean } {
  const title = trimField(snapshot.title);
  const summary = trimField(snapshot.summary);
  const body = trimField(snapshot.body);
  const bodyExcerpt = body.slice(0, 12_000);
  const hasEntryText = Boolean(title || summary || bodyExcerpt);

  const block = [
    "## Today's journal entry (what they want to discuss)",
    title ? `Title: ${title}` : "",
    summary ? `Summary: ${summary}` : "",
    bodyExcerpt ? `\n### Entry text\n${bodyExcerpt}` : "",
    `[journal:${entryId}]`,
  ].filter(Boolean).join("\n");

  return { block, hasEntryText };
}

export async function loadJournalReflectionContext(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  snapshotOverride?: JournalReflectionEntrySnapshot | null,
): Promise<JournalReflectionContext | null> {
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .select("id,entry_kind,title,summary,body,user_id")
    .eq("id", entryId)
    .maybeSingle();
  if (error || !entry || entry.user_id !== userId) return null;
  if (entry.entry_kind === "chat") {
    return { block: "", isReflection: false, hasEntryText: false };
  }

  const override = snapshotOverride ?? null;
  const useOverride = override && hasMeaningfulJournalReflectionText(override);
  const snapshot: JournalReflectionEntrySnapshot = useOverride
    ? override
    : {
      title: entry.title,
      summary: entry.summary,
      body: entry.body,
    };

  const { block, hasEntryText } = buildJournalReflectionBlock(entryId, snapshot);
  return { block, isReflection: true, hasEntryText };
}

export const JOURNAL_REFLECTION_OPENER_SEED =
  "(The user finished a journal entry and opened My AI to talk about what they wrote — see \"Today's journal entry\" below. Their journal text is the context; you do not need a separate chat message from them to begin. Write a warm opening: acknowledge what they shared in your own words (do not paste their entry back), offer encouragement or a brief prayer when it fits, connect to their living context when relevant, and invite them to go deeper. End with one gentle question. Keep it concise.)";

export const JOURNAL_REFLECTION_EMPTY_ENTRY_SEED =
  "(The user opened My AI after journaling, but their entry text has not synced yet. Write a brief warm opener inviting them to share what they wrote or what feels most alive from their entry right now. Do not say you need a \"message\" or that you cannot help — treat their journal as the starting point once they add a line in chat.)";
