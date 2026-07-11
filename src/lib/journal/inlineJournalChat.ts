import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";

export type InlineChatCitation = {
  source_type: "belief" | "journal" | "artifact" | "entity" | "identity" | "general" | "influence";
  id?: string;
  label: string;
};

export type InlineChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: InlineChatCitation[] | unknown;
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseInlineChatCitations(raw: unknown): InlineChatCitation[] {
  if (!Array.isArray(raw)) return [];
  const out: InlineChatCitation[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const st = item.source_type;
    const label = item.label;
    if (typeof st !== "string" || typeof label !== "string" || !label.trim()) continue;
    if (
      st !== "belief" && st !== "journal" && st !== "artifact" && st !== "entity" &&
      st !== "identity" && st !== "general" && st !== "influence"
    ) {
      continue;
    }
    const id = typeof item.id === "string" && item.id.length >= 32 ? item.id : undefined;
    out.push(id ? { source_type: st, id, label: label.trim() } : { source_type: st, label: label.trim() });
  }
  return out;
}

export async function loadInlineChatTurns(chatId: string): Promise<InlineChatTurn[]> {
  const { data } = await supabase
    .from("my_ai_messages")
    .select("id,role,content,citations,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  return ((data as { id: string; role: string; content: string; citations?: unknown }[]) ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      citations: m.role === "assistant" ? m.citations : undefined,
    }));
}

export type EnsureInlineChatParams = {
  userId: string;
  entryId: string;
  journalId?: string | null;
  title?: string | null;
  existingChatId?: string | null;
};

export function isJournalReflectionKind(entryKind: string | null | undefined): boolean {
  return entryKind !== "chat";
}

async function ensureLinkedJournalChatSession(
  params: EnsureInlineChatParams & { markAsChatEntry: boolean },
): Promise<{ entryId: string; chatId: string } | null> {
  const { userId, entryId, journalId: _journalId, title, existingChatId, markAsChatEntry } = params;

  if (markAsChatEntry) {
    const { error: kindErr } = await supabase
      .from("journal_entries")
      .update({ entry_kind: "chat" })
      .eq("id", entryId)
      .eq("user_id", userId);
    if (kindErr) {
      toast({ title: "Couldn't enable chat mode", description: kindErr.message, variant: "destructive" });
      return null;
    }
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

/** Chat-as-journal: marks the entry as `entry_kind = chat` and links a My AI thread. */
export async function ensureInlineJournalChatSession(
  params: EnsureInlineChatParams,
): Promise<{ entryId: string; chatId: string } | null> {
  return ensureLinkedJournalChatSession({ ...params, markAsChatEntry: true });
}

/** Reflection on a saved entry: links My AI without changing the entry body or kind. */
export async function ensureJournalReflectionChatSession(
  params: EnsureInlineChatParams,
): Promise<{ entryId: string; chatId: string } | null> {
  return ensureLinkedJournalChatSession({ ...params, markAsChatEntry: false });
}

export type JournalReflectionEntrySnapshot = {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
};

export async function bootstrapJournalReflectionOpener(params: {
  chatId: string;
  entryId: string;
  entrySnapshot?: JournalReflectionEntrySnapshot;
  includeGeneralKnowledge?: boolean;
  responseDepth?: ResponseDepthSetting;
}): Promise<void> {
  const snapshot = params.entrySnapshot;
  const hasSnapshot = Boolean(
    snapshot?.title?.trim() || snapshot?.summary?.trim() || snapshot?.body?.trim(),
  );
  const { data, error } = await supabase.functions.invoke("my-ai-chat", {
    body: {
      chat_id: params.chatId,
      journal_entry_id: params.entryId,
      mode: "journal",
      journal_reflection: true,
      journal_bootstrap_reflection: true,
      journal_reflection_entry: hasSnapshot ? snapshot : undefined,
      include_general_knowledge: params.includeGeneralKnowledge === true,
      response_depth: params.responseDepth ?? readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
      stream: false,
    },
  });
  if (error) {
    throw new Error(await edgeFunctionErrorMessage("my-ai-chat", error, data));
  }
  const payload = data as { error?: string } | null;
  if (payload && typeof payload === "object" && payload.error) throw new Error(payload.error);
}

export async function sendInlineJournalChatMessage(params: {
  chatId: string;
  entryId: string;
  message: string;
  responseDepth?: ResponseDepthSetting;
  includeGeneralKnowledge?: boolean;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("my-ai-chat", {
    body: {
      chat_id: params.chatId,
      message: params.message,
      mode: "journal",
      journal_entry_id: params.entryId,
      include_general_knowledge: params.includeGeneralKnowledge === true,
      response_depth: params.responseDepth ?? readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
    },
  });
  if (error) {
    throw new Error(await edgeFunctionErrorMessage("my-ai-chat", error, data));
  }
  const payload = data as { error?: string } | null;
  if (payload && typeof payload === "object" && payload.error) throw new Error(payload.error);
}
