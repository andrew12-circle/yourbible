import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  AUTO_CHAT_TITLE_MAX_WORDS,
  chatTitleFromFirstMessage,
  normalizeChatSessionTitle,
} from "@/lib/myai/chatTitle";

export type JournalChatSessionRow = {
  id: string;
  title: string | null;
  entry_at_ts: string;
};

function countWords(text: string): number {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function sessionTitleNeedsResolve(title: string | null | undefined): boolean {
  const t = title?.trim();
  if (!t) return true;
  return countWords(t) > AUTO_CHAT_TITLE_MAX_WORDS;
}

/**
 * Backfill missing or overlong journal chat session titles.
 * Untitled sessions derive from the first user message; long titles are word-capped.
 */
export async function resolveJournalChatSessionTitles(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessions: JournalChatSessionRow[],
): Promise<JournalChatSessionRow[]> {
  const needs = sessions.filter((s) => sessionTitleNeedsResolve(s.title));
  if (!needs.length) return sessions;

  const derived = new Map<string, string>();

  for (const session of needs) {
    const raw = session.title?.trim();
    if (raw) {
      const next = normalizeChatSessionTitle(raw);
      if (next && next !== raw) derived.set(session.id, next);
    }
  }

  const untitledIds = needs.filter((s) => !s.title?.trim()).map((s) => s.id);
  if (untitledIds.length) {
    const { data: chats } = await supabase
      .from("my_ai_chats")
      .select("id, journal_entry_id")
      .eq("user_id", userId)
      .in("journal_entry_id", untitledIds);

    if (chats?.length) {
      const entryToChat = new Map<string, string>();
      for (const chat of chats) {
        const entryId = chat.journal_entry_id;
        if (entryId && !entryToChat.has(entryId)) {
          entryToChat.set(entryId, chat.id);
        }
      }

      const chatIds = [...entryToChat.values()];
      if (chatIds.length) {
        const { data: msgs } = await supabase
          .from("my_ai_messages")
          .select("chat_id, content, created_at")
          .eq("user_id", userId)
          .in("chat_id", chatIds)
          .eq("role", "user")
          .order("created_at", { ascending: true });

        const firstByChat = new Map<string, string>();
        for (const row of msgs ?? []) {
          if (!firstByChat.has(row.chat_id)) {
            firstByChat.set(row.chat_id, row.content);
          }
        }

        for (const [entryId, chatId] of entryToChat) {
          const content = firstByChat.get(chatId);
          if (!content?.trim()) continue;
          derived.set(entryId, chatTitleFromFirstMessage(content));
        }
      }
    }
  }

  if (!derived.size) return sessions;

  await Promise.all(
    [...derived.entries()].map(([id, title]) =>
      supabase
        .from("journal_entries")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId),
    ),
  );

  return sessions.map((session) => {
    const title = derived.get(session.id);
    return title ? { ...session, title } : session;
  });
}
