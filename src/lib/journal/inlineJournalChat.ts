import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export type InlineChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function composeChatTranscript(turns: InlineChatTurn[], trailingUserDraft?: string): string {
  const lines: string[] = [];
  for (const t of turns) {
    const label = t.role === "assistant" ? "**AI**" : "**You**";
    lines.push(`${label}:\n\n${t.content.trim()}\n`);
  }
  if (trailingUserDraft?.trim()) {
    lines.push(`**You**:\n\n${trailingUserDraft.trim()}\n`);
  }
  return lines.join("\n---\n\n").trim();
}

export async function loadInlineChatTurns(chatId: string): Promise<InlineChatTurn[]> {
  const { data } = await supabase
    .from("my_ai_messages")
    .select("id,role,content,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  return ((data as { id: string; role: string; content: string }[]) ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }));
}

export type EnsureInlineChatParams = {
  userId: string;
  entryId: string;
  journalId?: string | null;
  title?: string | null;
  existingChatId?: string | null;
};

export async function ensureInlineJournalChatSession(
  params: EnsureInlineChatParams,
): Promise<{ entryId: string; chatId: string } | null> {
  const { userId, entryId, journalId, title, existingChatId } = params;

  const { error: kindErr } = await supabase
    .from("journal_entries")
    .update({ entry_kind: "chat" })
    .eq("id", entryId)
    .eq("user_id", userId);
  if (kindErr) {
    toast({ title: "Couldn't enable chat mode", description: kindErr.message, variant: "destructive" });
    return null;
  }

  let chatId = existingChatId ?? null;
  if (!chatId) {
    const { data: existing } = await supabase
      .from("my_ai_chats")
      .select("id")
      .eq("journal_entry_id", entryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.id) {
      chatId = existing.id;
    } else {
      const { data: created, error: cErr } = await supabase
        .from("my_ai_chats")
        .insert({
          user_id: userId,
          journal_entry_id: entryId,
          title: title?.trim() || null,
        })
        .select("id")
        .maybeSingle();
      if (cErr || !created) {
        toast({ title: "Couldn't start AI chat", description: cErr?.message, variant: "destructive" });
        return null;
      }
      chatId = created.id;
    }
  }

  return { entryId, chatId: chatId! };
}

export async function sendInlineJournalChatMessage(params: {
  chatId: string;
  entryId: string;
  message: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("my-ai-chat", {
    body: {
      chat_id: params.chatId,
      message: params.message,
      mode: "journal",
      journal_entry_id: params.entryId,
      include_general_knowledge: true,
    },
  });
  if (error) {
    throw new Error(await edgeFunctionErrorMessage("my-ai-chat", error, data));
  }
  const payload = data as { error?: string } | null;
  if (payload && typeof payload === "object" && payload.error) throw new Error(payload.error);
}
