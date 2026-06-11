import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  composeChatTranscript,
  ensureInlineJournalChatSession,
  loadInlineChatTurns,
  sendInlineJournalChatMessage,
  type InlineChatTurn,
} from "@/lib/journal/inlineJournalChat";
import {
  readJournalChatIncludeGeneralDefault,
} from "@/lib/journal/chatComposerSettings";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  readResponseDepthSetting,
} from "@/lib/journal/responseDepth";

type UseInlineJournalChatOpts = {
  userId: string | undefined;
  entryId: string | null;
  journalId?: string | null;
  title?: string | null;
  active: boolean;
  includeGeneralKnowledge?: boolean;
  onPersistTranscript?: (body: string) => void;
};

export function useInlineJournalChat({
  userId,
  entryId,
  journalId,
  title,
  active,
  includeGeneralKnowledge = readJournalChatIncludeGeneralDefault(),
  onPersistTranscript,
}: UseInlineJournalChatOpts) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTurns, setChatTurns] = useState<InlineChatTurn[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      chatBottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (!userId || !entryId) {
      setChatId(null);
      setChatTurns([]);
      setAiBusy(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: chatRow } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", entryId)
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!chatRow?.id) {
        setChatId(null);
        setChatTurns([]);
        return;
      }
      setChatId(chatRow.id);
      setChatTurns(await loadInlineChatTurns(chatRow.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId, userId]);

  useEffect(() => {
    if (!active) return;
    scrollToBottom();
  }, [active, chatTurns.length, aiBusy, scrollToBottom]);

  const persistTranscript = useCallback(
    (turns: InlineChatTurn[], trailingDraft?: string) => {
      if (!onPersistTranscript || !active || turns.length === 0) return;
      onPersistTranscript(composeChatTranscript(turns, trailingDraft));
    },
    [onPersistTranscript, active],
  );

  const ensureSession = useCallback(async () => {
    if (!userId || !entryId) return null;
    const ensured = await ensureInlineJournalChatSession({
      userId,
      entryId,
      journalId,
      title,
      existingChatId: chatId,
    });
    if (!ensured) return null;
    if (ensured.chatId !== chatId) setChatId(ensured.chatId);
    return ensured;
  }, [userId, entryId, journalId, title, chatId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || aiBusy || !userId || !entryId) return false;
      setAiBusy(true);
      const tempId = `tmp-${Date.now()}`;
      setChatTurns((prev) => [...prev, { id: tempId, role: "user", content: trimmed }]);
      try {
        const ensured = await ensureSession();
        if (!ensured) {
          setChatTurns((prev) => prev.filter((t) => t.id !== tempId));
          return false;
        }
        await sendInlineJournalChatMessage({
          chatId: ensured.chatId,
          entryId: ensured.entryId,
          message: trimmed,
          responseDepth: readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
          includeGeneralKnowledge,
        });
        const loaded = await loadInlineChatTurns(ensured.chatId);
        setChatTurns(loaded);
        persistTranscript(loaded);
        scrollToBottom();
        return true;
      } catch (e) {
        const description = e instanceof Error ? e.message : String(e);
        toast({ title: "AI reply failed", description, variant: "destructive" });
        setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
        return false;
      } finally {
        setAiBusy(false);
      }
    },
    [aiBusy, userId, entryId, ensureSession, persistTranscript, scrollToBottom, includeGeneralKnowledge],
  );

  return {
    chatId,
    chatTurns,
    aiBusy,
    chatScrollRef,
    chatBottomRef,
    ensureSession,
    sendMessage,
    scrollToBottom,
  };
}
