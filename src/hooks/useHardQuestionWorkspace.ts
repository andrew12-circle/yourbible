import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import { buildBriefSummaryFromPack, buildPackContextForChat } from "@/lib/framework/claimResearchRuns";
import {
  fetchLatestHardQuestionResearchRun,
  saveHardQuestionResearchRun,
  touchHardQuestionResearchRunChat,
  type HardQuestionResearchRunRow,
} from "@/lib/framework/hardQuestionResearchRuns";
import {
  addHardQuestionSource,
  fetchHardQuestionSources,
  removeHardQuestionSource,
  updateHardQuestion,
  type HardQuestionRow,
  type HardQuestionSourceRow,
  type HardQuestionStatus,
} from "@/lib/framework/hardQuestions";
import {
  formatResearchPackMarkdown,
  webSearchStatusLabel,
  type ResearchPackResp,
} from "@/lib/framework/claimResearchPack";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  readResponseDepthSetting,
} from "@/lib/journal/responseDepth";

type MsgRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Json;
};

type MyAiInvokeOk = {
  chat_id: string;
  assistant_message_id: string;
  content: string;
  citations: unknown[];
};

const LS_INCLUDE_GENERAL = "journal_chat.include_general";
const LS_PACK_WEB = "journal_chat.hard_question_web";

function readIncludeGeneralDefault(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_INCLUDE_GENERAL);
  if (v === "0" || v === "false") return false;
  return true;
}

function readPackWebDefault(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_PACK_WEB) === "1";
}

const chatSessionPromises = new Map<string, Promise<{ entryId: string; chatId: string }>>();

function sessionKey(userId: string, questionId: string) {
  return `${userId}:${questionId}`;
}

async function ensureHardQuestionChatSession(
  userId: string,
  questionId: string,
  title: string,
): Promise<{ entryId: string; chatId: string }> {
  const key = sessionKey(userId, questionId);
  const hit = chatSessionPromises.get(key);
  if (hit) return hit;

  const p = (async () => {
    const { data: existing } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("user_id", userId)
      .contains("tags", [`hard-question:${questionId}`])
      .eq("entry_kind", "chat")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { data: chatRow } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", existing.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (chatRow?.id) {
        return { entryId: existing.id as string, chatId: chatRow.id as string };
      }
    }

    const jid = await getDefaultJournalId(userId);
    const ctx = await getCurrentContext().catch(() => ({} as Record<string, unknown>));
    const now = new Date();
    const { data: ent, error: eErr } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        journal_id: jid,
        title: `Hard question — ${title.slice(0, 80)}`,
        body: "",
        tags: [`hard-question:${questionId}`],
        entry_kind: "chat",
        analyze_for_mirror: false,
        entry_at_ts: now.toISOString(),
        entry_at: now.toISOString().slice(0, 10),
        location_name: (ctx.location_name as string | undefined) ?? null,
      })
      .select("id")
      .single();
    if (eErr || !ent) throw new Error(eErr?.message ?? "Could not create journal entry");

    const { data: chat, error: cErr } = await supabase
      .from("my_ai_chats")
      .insert({
        user_id: userId,
        title: `Hard question — ${title.slice(0, 60)}`,
        journal_entry_id: ent.id,
      })
      .select("id")
      .single();
    if (cErr || !chat) throw new Error(cErr?.message ?? "Could not create chat");

    return { entryId: ent.id as string, chatId: chat.id as string };
  })();

  chatSessionPromises.set(key, p);
  return p;
}

export function useHardQuestionWorkspace(userId: string, question: HardQuestionRow) {
  const questionId = question.id;

  const [sources, setSources] = useState<HardQuestionSourceRow[]>([]);
  const [notes, setNotes] = useState(question.notes ?? "");
  const [conclusion, setConclusion] = useState(question.conclusion ?? "");
  const [confidence, setConfidence] = useState<number | null>(question.confidence);
  const [status, setStatus] = useState<HardQuestionStatus>(question.status as HardQuestionStatus);

  const [entryId, setEntryId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingShell, setLoadingShell] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatBootstrapping, setChatBootstrapping] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const sendingRef = useRef(false);
  const ignoreResult = useRef(false);
  const briefStartedRef = useRef(false);
  const openerDoneRef = useRef(false);

  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [packUseWeb, setPackUseWeb] = useState(readPackWebDefault);
  const [briefLoading, setBriefLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [packData, setPackData] = useState<ResearchPackResp | null>(null);
  const [packInstance, setPackInstance] = useState(0);
  const [latestRun, setLatestRun] = useState<HardQuestionResearchRunRow | null>(null);
  const [beliefUpdateOpen, setBeliefUpdateOpen] = useState(false);
  const [savingFields, setSavingFields] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_PACK_WEB, packUseWeb ? "1" : "0");
  }, [packUseWeb]);

  const loadSources = useCallback(async () => {
    const rows = await fetchHardQuestionSources(supabase, userId, questionId);
    setSources(rows);
  }, [userId, questionId]);

  const loadMessages = useCallback(async (cId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from("my_ai_messages")
      .select("id,role,content,citations")
      .eq("chat_id", cId)
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Could not load messages", description: error.message, variant: "destructive" });
      setMessages([]);
    } else {
      setMessages((data as MsgRow[]) ?? []);
    }
    setLoadingMessages(false);
  }, []);

  const invokeResearchPack = useCallback(
    async (userQuestion?: string) => {
      const { data, error } = await supabase.functions.invoke<ResearchPackResp>("question-research-pack", {
        body: {
          hard_question_id: questionId,
          pack_type: "standard",
          user_question: userQuestion?.trim() || undefined,
          claim_research: { use_web: packUseWeb },
        },
      });
      if (error) throw new Error(error.message);
      const payload = data as ResearchPackResp | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      if (!payload || typeof payload !== "object" || !("sections" in payload) || !payload.sections) {
        throw new Error("Unexpected response from question research");
      }
      return payload as ResearchPackResp;
    },
    [questionId, packUseWeb],
  );

  const persistPack = useCallback(
    async (pack: ResearchPackResp, userQuestion?: string) => {
      const run = await saveHardQuestionResearchRun(supabase, {
        userId,
        questionId,
        pack,
        useWeb: packUseWeb,
        userQuestion,
      });
      if (run) setLatestRun(run);
      void updateHardQuestion(supabase, userId, questionId, { status: "researching" });
      setStatus("researching");
      return run;
    },
    [userId, questionId, packUseWeb],
  );

  const loadOrRunBrief = useCallback(
    async (force = false) => {
      if (briefLoading && !force) return;
      setBriefLoading(true);
      try {
        if (!force) {
          const cached = await fetchLatestHardQuestionResearchRun(supabase, userId, questionId);
          if (cached?.pack_json) {
            setPackData(cached.pack_json);
            setLatestRun(cached);
            setPackInstance((n) => n + 1);
            return cached.pack_json;
          }
        }
        const pack = await invokeResearchPack();
        setPackData(pack);
        setPackInstance((n) => n + 1);
        await persistPack(pack);
        return pack;
      } finally {
        setBriefLoading(false);
      }
    },
    [briefLoading, userId, questionId, invokeResearchPack, persistPack],
  );

  const runBootstrapOpener = useCallback(
    async (cId: string, eId: string) => {
      if (openerDoneRef.current) return;
      openerDoneRef.current = true;
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: cId,
          journal_entry_id: eId,
          mode: "journal",
          journal_bootstrap_opener: true,
          journal_bootstrap_hard_question_id: questionId,
          include_general_knowledge: includeGeneral,
          response_depth: readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
          hard_question_id: questionId,
        },
      });
      if (error) throw new Error(error.message);
      await loadMessages(cId);
      void data;
    },
    [questionId, includeGeneral, loadMessages],
  );

  useEffect(() => {
    let cancelled = false;
    briefStartedRef.current = false;
    openerDoneRef.current = false;

    void loadSources();

    (async () => {
      setLoadingShell(true);
      setEntryId(null);
      setChatId(null);
      setMessages([]);
      setPackData(null);
      setLatestRun(null);

      try {
        const { entryId: eId, chatId: cId } = await ensureHardQuestionChatSession(
          userId,
          questionId,
          question.title,
        );
        if (cancelled) return;
        setEntryId(eId);
        setChatId(cId);
        await loadMessages(cId);
        if (cancelled) return;
        setLoadingShell(false);

        const runBrief = async () => {
          if (briefStartedRef.current) return;
          briefStartedRef.current = true;
          setBriefLoading(true);
          try {
            const cached = await fetchLatestHardQuestionResearchRun(supabase, userId, questionId);
            if (cached?.pack_json) {
              setPackData(cached.pack_json);
              setLatestRun(cached);
              setPackInstance((n) => n + 1);
              return;
            }
            const pack = await invokeResearchPack();
            if (cancelled) return;
            setPackData(pack);
            setPackInstance((n) => n + 1);
            const run = await saveHardQuestionResearchRun(supabase, {
              userId,
              questionId,
              pack,
              useWeb: packUseWeb,
            });
            if (run) setLatestRun(run);
          } catch (e) {
            if (!cancelled) {
              toast({
                title: "Research pack could not load",
                description: String(e),
                variant: "destructive",
              });
            }
          } finally {
            if (!cancelled) setBriefLoading(false);
          }
        };
        void runBrief();

        const { count } = await supabase
          .from("my_ai_messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", cId)
          .in("role", ["user", "assistant"]);
        if (!cancelled && (count ?? 0) === 0) {
          setChatBootstrapping(true);
          void runBootstrapOpener(cId, eId)
            .catch((e) => {
              if (!cancelled) {
                toast({ title: "Could not start chat", description: String(e), variant: "destructive" });
              }
            })
            .finally(() => {
              if (!cancelled) setChatBootstrapping(false);
            });
        }
      } catch (e) {
        if (!cancelled) {
          toast({ title: "Could not open workspace", description: String(e), variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingShell(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per question
  }, [userId, questionId, question.title]);

  const stop = () => {
    ignoreResult.current = true;
    sendingRef.current = false;
    setSending(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sendingRef.current || !chatId || !entryId) return;
    ignoreResult.current = false;
    setInput("");
    sendingRef.current = true;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: chatId,
          message: text,
          mode: "journal",
          journal_entry_id: entryId,
          include_general_knowledge: includeGeneral,
          response_depth: readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
          hard_question_id: questionId,
        },
      });
      if (ignoreResult.current) return;
      if (error) throw new Error(error.message);
      if (latestRun?.id) void touchHardQuestionResearchRunChat(supabase, latestRun.id, userId);
      await loadMessages(chatId);
      void data;
    } catch (e) {
      if (!ignoreResult.current) {
        toast({ title: "Message failed", description: String(e), variant: "destructive" });
        setInput(text);
      }
    } finally {
      sendingRef.current = false;
      if (!ignoreResult.current) setSending(false);
      ignoreResult.current = false;
    }
  };

  const retryLast = async () => {
    if (!chatId || !entryId || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("my-ai-chat", {
        body: {
          chat_id: chatId,
          retry_last: true,
          mode: "journal",
          journal_entry_id: entryId,
          include_general_knowledge: includeGeneral,
          response_depth: readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
          hard_question_id: questionId,
        },
      });
      if (error) throw new Error(error.message);
      await loadMessages(chatId);
    } catch (e) {
      toast({ title: "Retry failed", description: String(e), variant: "destructive" });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const saveNotes = async () => {
    setSavingFields(true);
    const ok = await updateHardQuestion(supabase, userId, questionId, { notes: notes.trim() });
    setSavingFields(false);
    if (ok) toast({ title: "Notes saved" });
    else toast({ title: "Save failed", variant: "destructive" });
  };

  const saveConclusion = async (markConcluded = false) => {
    setSavingFields(true);
    const ok = await updateHardQuestion(supabase, userId, questionId, {
      conclusion: conclusion.trim() || null,
      confidence,
      status: markConcluded ? "concluded" : status,
    });
    setSavingFields(false);
    if (ok) {
      if (markConcluded) setStatus("concluded");
      toast({ title: markConcluded ? "Question concluded" : "Conclusion saved" });
    } else {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const addSource = async (input: {
    label: string;
    kind: HardQuestionSourceRow["kind"];
    snippet?: string;
    url?: string;
    artifactId?: string;
  }) => {
    const row = await addHardQuestionSource(supabase, userId, questionId, input);
    if (row) {
      setSources((prev) => [row, ...prev]);
      toast({ title: "Source added" });
    } else {
      toast({ title: "Could not add source", variant: "destructive" });
    }
  };

  const deleteSource = async (sourceId: string) => {
    const ok = await removeHardQuestionSource(supabase, userId, sourceId);
    if (ok) setSources((prev) => prev.filter((s) => s.id !== sourceId));
  };

  const openFullReport = async () => {
    setPackOpen(true);
    if (packData) return;
    setReportLoading(true);
    try {
      await loadOrRunBrief(true);
    } catch (e) {
      toast({ title: "Research pack failed", description: String(e), variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const refreshBrief = async () => {
    setBriefLoading(true);
    try {
      await loadOrRunBrief(true);
      toast({ title: "Research refreshed" });
    } catch (e) {
      toast({ title: "Refresh failed", description: String(e), variant: "destructive" });
    } finally {
      setBriefLoading(false);
    }
  };

  const packMarkdown = packData ? formatResearchPackMarkdown(packData) : "";
  const briefSummary = packData
    ? latestRun?.brief_summary ?? buildBriefSummaryFromPack(packData)
    : null;
  const showLoading = loadingShell || !chatId || !entryId;
  const visibleMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");

  return {
    sources,
    notes,
    setNotes,
    conclusion,
    setConclusion,
    confidence,
    setConfidence,
    status,
    setStatus,
    entryId,
    chatId,
    messages: visibleMessages,
    showLoading,
    loadingMessages,
    sending,
    input,
    setInput,
    includeGeneral,
    setIncludeGeneral,
    packUseWeb,
    setPackUseWeb,
    packOpen,
    setPackOpen,
    briefLoading,
    reportLoading,
    chatBootstrapping,
    packData,
    packInstance,
    packMarkdown,
    briefSummary,
    latestRun,
    beliefUpdateOpen,
    setBeliefUpdateOpen,
    savingFields,
    stop,
    send,
    retryLast,
    saveNotes,
    saveConclusion,
    addSource,
    deleteSource,
    openFullReport,
    refreshBrief,
    webStatusLabel: packData?.meta ? webSearchStatusLabel(packData.meta) : null,
    packContextForChat: packData ? buildPackContextForChat(packData) : "",
  };
}
