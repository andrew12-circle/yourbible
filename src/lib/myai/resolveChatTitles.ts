import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  AUTO_CHAT_TITLE_MAX_WORDS,
  chatTitleFromFirstMessage,
  normalizeChatSessionTitle,
} from "@/lib/myai/chatTitle";

export type ChatTitleRow = {
  id: string;
  title: string | null;
  updated_at: string;
  project_id?: string | null;
  journal_entry_id?: string | null;
};

function countWords(text: string): number {
  return text.replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function chatTitleNeedsResolve(title: string | null | undefined): boolean {
  const t = title?.trim();
  if (!t) return true;
  return countWords(t) > AUTO_CHAT_TITLE_MAX_WORDS;
}

/**
 * Backfill missing or overlong `my_ai_chats.title` values.
 * Untitled chats derive from the first user message; long titles are word-capped.
 */
export async function resolveUntitledChats(
  supabase: SupabaseClient<Database>,
  userId: string,
  chats: ChatTitleRow[],
): Promise<ChatTitleRow[]> {
  const needs = chats.filter((c) => chatTitleNeedsResolve(c.title));
  if (!needs.length) return chats;

  const derivedTitles = new Map<string, string>();

  for (const chat of needs) {
    const raw = chat.title?.trim();
    if (raw) {
      const next = normalizeChatSessionTitle(raw);
      if (next && next !== raw) derivedTitles.set(chat.id, next);
    }
  }

  const untitled = needs.filter((c) => !c.title?.trim());
  if (untitled.length) {
    const chatIds = untitled.map((c) => c.id);
    const { data: msgs, error } = await supabase
      .from("my_ai_messages")
      .select("chat_id, content, created_at")
      .eq("user_id", userId)
      .in("chat_id", chatIds)
      .eq("role", "user")
      .order("created_at", { ascending: true });

    if (!error && msgs?.length) {
      const firstMessageByChat = new Map<string, string>();
      for (const row of msgs) {
        if (!firstMessageByChat.has(row.chat_id)) {
          firstMessageByChat.set(row.chat_id, row.content);
        }
      }

      for (const chat of untitled) {
        const content = firstMessageByChat.get(chat.id);
        if (!content?.trim()) continue;
        derivedTitles.set(chat.id, normalizeChatSessionTitle(chatTitleFromFirstMessage(content)));
      }
    }
  }

  if (!derivedTitles.size) return chats;

  await Promise.all(
    [...derivedTitles.entries()].map(([id, title]) =>
      supabase.from("my_ai_chats").update({ title }).eq("id", id).eq("user_id", userId),
    ),
  );

  return chats.map((chat) => {
    const title = derivedTitles.get(chat.id);
    return title ? { ...chat, title } : chat;
  });
}
