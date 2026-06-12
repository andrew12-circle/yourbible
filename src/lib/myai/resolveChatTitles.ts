import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { chatTitleFromFirstMessage } from "@/lib/myai/chatTitle";

export type ChatTitleRow = {
  id: string;
  title: string | null;
  updated_at: string;
  project_id?: string | null;
  journal_entry_id?: string | null;
};

/**
 * Backfill missing `my_ai_chats.title` values from each thread's first user message.
 * Persists titles so the sidebar stays labeled after reload.
 */
export async function resolveUntitledChats(
  supabase: SupabaseClient<Database>,
  userId: string,
  chats: ChatTitleRow[],
): Promise<ChatTitleRow[]> {
  const untitled = chats.filter((c) => !c.title?.trim());
  if (!untitled.length) return chats;

  const chatIds = untitled.map((c) => c.id);
  const { data: msgs, error } = await supabase
    .from("my_ai_messages")
    .select("chat_id, content, created_at")
    .eq("user_id", userId)
    .in("chat_id", chatIds)
    .eq("role", "user")
    .order("created_at", { ascending: true });

  if (error || !msgs?.length) return chats;

  const firstMessageByChat = new Map<string, string>();
  for (const row of msgs) {
    if (!firstMessageByChat.has(row.chat_id)) {
      firstMessageByChat.set(row.chat_id, row.content);
    }
  }

  const derivedTitles = new Map<string, string>();
  const updates: Promise<unknown>[] = [];

  for (const chat of untitled) {
    const content = firstMessageByChat.get(chat.id);
    if (!content?.trim()) continue;
    const title = chatTitleFromFirstMessage(content);
    derivedTitles.set(chat.id, title);
    updates.push(
      supabase.from("my_ai_chats").update({ title }).eq("id", chat.id).eq("user_id", userId),
    );
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  if (!derivedTitles.size) return chats;

  return chats.map((chat) => {
    const derived = derivedTitles.get(chat.id);
    if (!derived || chat.title?.trim()) return chat;
    return { ...chat, title: derived };
  });
}
