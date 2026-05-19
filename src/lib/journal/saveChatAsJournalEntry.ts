import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export type SaveChatAsJournalResult = {
  entryId: string;
  title?: string | null;
};

/**
 * Turn a My AI thread or in-progress chat journal into a saved journal entry.
 * - Standalone `my_ai_chats` → new entry via `export_chat_to_journal_id`.
 * - `entry_kind = 'chat'` rows → finalize in place via `finalize_journal_entry_id`.
 */
export async function saveChatAsJournalEntry(opts: {
  chatId?: string | null;
  journalEntryId?: string | null;
}): Promise<SaveChatAsJournalResult> {
  const { chatId, journalEntryId } = opts;

  if (journalEntryId) {
    const { data, error } = await supabase.functions.invoke("my-ai-chat", {
      body: { finalize_journal_entry_id: journalEntryId },
    });
    if (error) {
      throw new Error(await edgeFunctionErrorMessage("my-ai-chat", error, data));
    }
    const payload = data as { ok?: boolean; error?: string; entry_id?: string } | null;
    if (payload?.error) throw new Error(payload.error);
    if (!payload?.ok) throw new Error("Could not save chat as journal entry");
    return { entryId: payload.entry_id ?? journalEntryId, title: (payload as { title?: string }).title };
  }

  if (!chatId) {
    throw new Error("No chat to save");
  }

  const { data, error } = await supabase.functions.invoke("my-ai-chat", {
    body: { export_chat_to_journal_id: chatId },
  });
  if (error) {
    throw new Error(await edgeFunctionErrorMessage("my-ai-chat", error, data));
  }
  const payload = data as {
    ok?: boolean;
    error?: string;
    entry_id?: string;
    journal_entry_id?: string;
    title?: string;
  } | null;
  if (payload?.error) {
    if (payload.journal_entry_id) {
      return saveChatAsJournalEntry({ journalEntryId: payload.journal_entry_id });
    }
    throw new Error(payload.error);
  }
  if (!payload?.ok || !payload.entry_id) {
    throw new Error("Could not save chat as journal entry");
  }
  return { entryId: payload.entry_id, title: payload.title };
}
