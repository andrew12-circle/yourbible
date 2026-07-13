import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  bootstrapJournalReflectionOpener,
  composeChatTranscript,
  ensureInlineJournalChatSession,
  ensureJournalReflectionChatSession,
  loadInlineChatTurns,
  JOURNAL_REFLECTION_AUTO_OPEN_MESSAGE,
  type InlineChatTurn,
  type JournalReflectionEntrySnapshot,
} from "@/lib/journal/inlineJournalChat";
import {
  readJournalChatIncludeGeneralDefault,
} from "@/lib/journal/chatComposerSettings";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  readResponseDepthSetting,
} from "@/lib/journal/responseDepth";
import { streamMyAiChat } from "@/lib/myai/invokeMyAiChat";

type UseInlineJournalChatOpts = {
  userId: string | undefined;
  entryId: string | null;
  journalId?: string | null;
  title?: string | null;
  active: boolean;
  /** When true, chat is about a saved entry — do not overwrite journal body or change entry kind. */
  reflectionMode?: boolean;
  /** Current entry text for reflection context (avoids stale DB reads right after journaling). */
  reflectionEntrySnapshot?: JournalReflectionEntrySnapshot | null;
  includeGeneralKnowledge?: boolean;
  onPersistTranscript?: (body: string) => void;
};

export function useInlineJournalChat({
  userId,
  entryId,
  journalId,
  title,
  active,
  reflectionMode = false,
  reflectionEntrySnapshot = null,
  includeGeneralKnowledge = readJournalChatIncludeGeneralDefault(),
  onPersistTranscript,
}: UseInlineJournalChatOpts) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTurns, setChatTurns] = useState<InlineChatTurn[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: aiBusy ? "auto" : "smooth" });
      chatBottomRef.current?.scrollIntoView({ block: "end", behavior: aiBusy ? "auto" : "smooth" });
    });
  }, [aiBusy]);

  useEffect(() => {
    if (!userId || !entryId) {
      setChatId(null);
      setChatTurns([]);
      setAiBusy(false);
      setStreamingAssistantId(null);
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
  }, [active, chatTurns, aiBusy, scrollToBottom]);

  const persistTranscript = useCallback(
    (turns: InlineChatTurn[], trailingDraft?: string) => {
      if (reflectionMode || !onPersistTranscript || !active || turns.length === 0) return;
      onPersistTranscript(composeChatTranscript(turns, trailingDraft));
    },
    [onPersistTranscript, active, reflectionMode],
  );

  const ensureSession = useCallback(async () => {
    if (!userId || !entryId) return null;
    const ensure = reflectionMode ? ensureJournalReflectionChatSession : ensureInlineJournalChatSession;
    const ensured = await ensure({
      userId,
      entryId,
      journalId,
      title,
      existingChatId: chatId,
    });
    if (!ensured) return null;
    if (ensured.chatId !== chatId) setChatId(ensured.chatId);
    return ensured;
  }, [userId, entryId, journalId, title, chatId, reflectionMode]);

  const bootstrapReflection = useCallback(async () => {
    if (!reflectionMode || !userId || !entryId) return false;
    setAiBusy(true);
    const assistantTempId = `tmp-asst-${Date.now()}`;
    setStreamingAssistantId(assistantTempId);
    setChatTurns([{ id: assistantTempId, role: "assistant", content: "" }]);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const ensured = await ensureSession();
      if (!ensured) {
        setChatTurns([]);
        return false;
      }

      const existing = await loadInlineChatTurns(ensured.chatId);
      if (existing.length > 0) {
        setChatTurns(existing);
        scrollToBottom();
        return true;
      }

      try {
        await bootstrapJournalReflectionOpener({
          chatId: ensured.chatId,
          entryId: ensured.entryId,
          entrySnapshot: reflectionEntrySnapshot ?? undefined,
          includeGeneralKnowledge,
          responseDepth: readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
        });
      } catch (bootstrapErr) {
        const description =
          bootstrapErr instanceof Error ? bootstrapErr.message : String(bootstrapErr);
        // Older deployed my-ai-chat builds reject empty-message bootstrap; retry as a normal
        // reflection turn with the auto-open prompt + journal snapshot.
        if (!/message is required/i.test(description)) throw bootstrapErr;

        const seed = JOURNAL_REFLECTION_AUTO_OPEN_MESSAGE;
        const userTempId = `tmp-user-${Date.now()}`;
        setChatTurns([
          { id: userTempId, role: "user", content: seed },
          { id: assistantTempId, role: "assistant", content: "" },
        ]);

        const snapshot = reflectionEntrySnapshot;
        const hasSnapshot = Boolean(
          snapshot?.title?.trim() || snapshot?.summary?.trim() || snapshot?.body?.trim(),
        );

        await streamMyAiChat({
          signal: abortRef.current.signal,
          body: {
            chat_id: ensured.chatId,
            message: seed,
            mode: "journal",
            journal_entry_id: ensured.entryId,
            journal_reflection: true,
            journal_reflection_entry: hasSnapshot ? snapshot ?? undefined : undefined,
            include_general_knowledge: includeGeneralKnowledge,
            response_depth: readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
          },
          onDelta: (acc) => {
            setChatTurns((prev) =>
              prev.map((t) => (t.id === assistantTempId ? { ...t, content: acc } : t)),
            );
          },
        });
      }

      const loaded = await loadInlineChatTurns(ensured.chatId);
      setChatTurns(loaded);
      scrollToBottom();
      return true;
    } catch (e) {
      const description = e instanceof Error ? e.message : String(e);
      toast({ title: "Couldn't start My AI", description, variant: "destructive" });
      setChatTurns([]);
      return false;
    } finally {
      abortRef.current = null;
      setStreamingAssistantId(null);
      setAiBusy(false);
    }
  }, [reflectionMode, userId, entryId, ensureSession, includeGeneralKnowledge, scrollToBottom, reflectionEntrySnapshot]);

  const reflectionSnapshotPayload = useCallback(() => {
    if (!reflectionMode || !reflectionEntrySnapshot) return undefined;
    const { title, summary, body } = reflectionEntrySnapshot;
    if (!title?.trim() && !summary?.trim() && !body?.trim()) return undefined;
    return reflectionEntrySnapshot;
  }, [reflectionMode, reflectionEntrySnapshot]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || aiBusy || !userId || !entryId) return false;
      setAiBusy(true);
      const userTempId = `tmp-user-${Date.now()}`;
      const assistantTempId = `tmp-asst-${Date.now()}`;
      setStreamingAssistantId(assistantTempId);
      setChatTurns((prev) => [
        ...prev,
        { id: userTempId, role: "user", content: trimmed },
        { id: assistantTempId, role: "assistant", content: "" },
      ]);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const ensured = await ensureSession();
        if (!ensured) {
          setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
          return false;
        }

        await streamMyAiChat({
          signal: abortRef.current.signal,
          body: {
            chat_id: ensured.chatId,
            message: trimmed,
            mode: "journal",
            journal_entry_id: ensured.entryId,
            journal_reflection: reflectionMode || undefined,
            journal_reflection_entry: reflectionSnapshotPayload(),
            include_general_knowledge: includeGeneralKnowledge,
            response_depth: readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
          },
          onDelta: (acc) => {
            setChatTurns((prev) =>
              prev.map((t) => (t.id === assistantTempId ? { ...t, content: acc } : t)),
            );
          },
        });

        const loaded = await loadInlineChatTurns(ensured.chatId);
        setChatTurns(loaded);
        persistTranscript(loaded);
        scrollToBottom();
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          if (chatId) setChatTurns(await loadInlineChatTurns(chatId));
          return false;
        }
        const description = e instanceof Error ? e.message : String(e);
        toast({ title: "AI reply failed", description, variant: "destructive" });
        setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
        return false;
      } finally {
        abortRef.current = null;
        setStreamingAssistantId(null);
        setAiBusy(false);
      }
    },
    [aiBusy, userId, entryId, ensureSession, persistTranscript, scrollToBottom, includeGeneralKnowledge, chatId, reflectionMode, reflectionSnapshotPayload],
  );

  return {
    chatId,
    chatTurns,
    aiBusy,
    streamingAssistantId,
    chatScrollRef,
    chatBottomRef,
    ensureSession,
    sendMessage,
    bootstrapReflection,
    scrollToBottom,
  };
}
