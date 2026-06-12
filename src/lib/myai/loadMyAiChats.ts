import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MyAiChatListItem } from "@/lib/myai/chatSections";

function isMissingColumnError(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes(column.toLowerCase()) &&
    (lower.includes("does not exist") || lower.includes("could not find") || lower.includes("schema cache"))
  );
}

/** Load sidebar chats; falls back when optional columns (e.g. project_id) are not migrated yet. */
export async function loadMyAiChatsForSidebar(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ rows: MyAiChatListItem[]; error: string | null }> {
  const full = await supabase
    .from("my_ai_chats")
    .select("id,title,updated_at,project_id,journal_entry_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!full.error) {
    return { rows: (full.data as MyAiChatListItem[]) ?? [], error: null };
  }

  const msg = full.error.message;

  if (isMissingColumnError(msg, "project_id")) {
    const withJournal = await supabase
      .from("my_ai_chats")
      .select("id,title,updated_at,journal_entry_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!withJournal.error) {
      const rows = ((withJournal.data ?? []) as Omit<MyAiChatListItem, "project_id">[]).map((c) => ({
        ...c,
        project_id: null,
      }));
      return { rows, error: null };
    }

    if (isMissingColumnError(withJournal.error.message, "journal_entry_id")) {
      const legacy = await supabase
        .from("my_ai_chats")
        .select("id,title,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!legacy.error) {
        const rows = ((legacy.data ?? []) as { id: string; title: string | null; updated_at: string }[]).map(
          (c) => ({
            ...c,
            project_id: null,
            journal_entry_id: null,
          }),
        );
        return { rows, error: null };
      }
      return { rows: [], error: legacy.error.message };
    }

    return { rows: [], error: withJournal.error.message };
  }

  return { rows: [], error: msg };
}
