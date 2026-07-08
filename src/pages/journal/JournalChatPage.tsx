/**
 * Legacy chat-journal sessions (`entry_kind = 'chat'`). New conversations should start at `/my-ai`
 * and use "Save to journal" when done. This route remains for existing chat entries and claim handoff.
 * Same backend as My AI: `my-ai-chat` + `my_ai_messages`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  MessageSquare,
  PenLine,
  Settings2,
  Square,
  AudioLines,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PrivacyBlurInput } from "@/components/writing/PrivacyBlurInput";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import JournalChatSessionsPicker from "@/components/journal/JournalChatSessionsPicker";
import JournalLiveChatCollapsible from "@/components/journal/JournalLiveChatCollapsible";
import InlineJournalChatComposer from "@/components/journal/InlineJournalChatComposer";
import { parseChatJournalEntry } from "@/lib/journal/chatJournalEntry";
import type { InlineChatTurn } from "@/lib/journal/inlineJournalChat";
import { Switch } from "@/components/ui/switch";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import JournalPrivacyBlurToggle from "@/components/journal/JournalPrivacyBlurToggle";
import { DictInterimPreview } from "@/components/journal/DictInterimPreview";
import { toast } from "@/hooks/use-toast";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { cn } from "@/lib/utils";
import { createAssistantTtsSession } from "@/lib/ai/assistantTts";
import { readAndClearClaimChatHandoff, setClaimChatHandoff } from "@/lib/journal/claimChatHandoff";
import { resolveJournalChatSessionTitles } from "@/lib/journal/resolveJournalChatSessionTitles";
import { normalizeChatSessionTitle } from "@/lib/myai/chatTitle";
import ClaimResearchBar from "@/components/journal/ClaimResearchBar";
import type { ClaimVerdict } from "@/lib/framework/claimVerdict";
import { saveChatAsJournalEntry } from "@/lib/journal/saveChatAsJournalEntry";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import {
  useLockBodyScrollWhenKeyboardActive,
  useVisualViewportMetrics,
} from "@/hooks/useKeyboardInset";
import { useJournalEntryTextareaAutosize } from "@/hooks/useJournalEntryTextareaAutosize";
import { mobileCenteredScreen } from "@/lib/shell/mobileShellClasses";
import ResponseDepthControl from "@/components/journal/ResponseDepthControl";
import ChatAssistantMarkdown from "@/components/journal/ChatAssistantMarkdown";
import ChatMessageActions from "@/components/journal/ChatMessageActions";
import ChatSourceAttribution from "@/components/journal/ChatSourceAttribution";
import ChatOpeningBlessing from "@/components/journal/ChatOpeningBlessing";
import { streamMyAiChat, type MyAiChatCitation } from "@/lib/myai/invokeMyAiChat";
import {
  journalChatUserBubbleClass,
  journalPlainWriteFieldClass,
} from "@/lib/journal/journalChatUi";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  persistResponseDepthSetting,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";
import { hubShellBottomDock, hubShellPageHeight } from "@/lib/shell/hubShellClasses";

import {
  readJournalChatIncludeGeneralDefault,
  persistJournalChatIncludeGeneral,
  readJournalChatVoiceRepliesDefault,
  persistJournalChatVoiceReplies,
} from "@/lib/journal/chatComposerSettings";
const SILENCE_AFTER_FINAL_MS = 1500;

type Citation = {
  source_type: "belief" | "journal" | "artifact" | "entity" | "identity" | "general" | "influence";
  id?: string;
  label: string;
};

type MsgRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[] | Json;
};

function citationsFromStream(raw: MyAiChatCitation[]): Citation[] {
  return raw.map((c) => {
    const base = {
      source_type: c.source_type,
      label: c.label,
      ...(c.url ? { url: c.url } : {}),
      ...(c.start_seconds != null ? { start_seconds: c.start_seconds } : {}),
    };
    return c.id ? { ...base, id: c.id } : base;
  });
}

type ClaimFocusSession = {
  claimId: string;
  artifactId: string;
  claimPreview: string;
  matchedBeliefId: string | null;
  artifactTitle: string | null;
};

function readIncludeGeneralDefault(): boolean {
  return readJournalChatIncludeGeneralDefault();
}

function readVoiceRepliesDefault(): boolean {
  return readJournalChatVoiceRepliesDefault();
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}

export default function JournalChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const navigate = useNavigate();
  const { entryId: routeEntryId } = useParams<{ entryId?: string }>();
  const { keyboardInset: kbInset, offsetTop: vvOffsetTop } = useVisualViewportMetrics();
  const [composerFocused, setComposerFocused] = useState(false);
  const [writeFocused, setWriteFocused] = useState(false);

  const [bootstrapping, setBootstrapping] = useState(false);
  const [sessions, setSessions] = useState<{ id: string; title: string | null; entry_at_ts: string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [entryTitle, setEntryTitle] = useState("");
  const [analyzeForMirror, setAnalyzeForMirror] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [responseDepth, setResponseDepth] = useState<ResponseDepthSetting>(() =>
    readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "write">("chat");
  const [journalBody, setJournalBody] = useState("");
  const [headerMoreOpen, setHeaderMoreOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerLockScrollYRef = useRef<number | null>(null);
  const writeLockScrollYRef = useRef<number | null>(null);
  const writeBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const [dictationListening, setDictationListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(readVoiceRepliesDefault);
  const ignoreResult = useRef(false);

  const sendingRef = useRef(false);
  const inputRef = useRef("");
  const dictInterimRef = useRef("");
  const lastDictationFinalAtRef = useRef(0);
  const voiceHadFinalSinceMicOnRef = useRef(false);
  const includeGeneralRef = useRef(includeGeneral);
  const responseDepthRef = useRef(responseDepth);
  const voiceRepliesRef = useRef(voiceReplies);
  const mountedRef = useRef(true);
  const assistantTtsRef = useRef(createAssistantTtsSession({
    enabled: () => voiceRepliesRef.current,
    mounted: () => mountedRef.current,
  }));
  const sendRef = useRef<(textOverride?: string) => Promise<void>>(async () => {});
  const prevRouteEntryIdRef = useRef<string | undefined>(undefined);
  const [claimFocusSession, setClaimFocusSession] = useState<ClaimFocusSession | null>(null);
  const [claimVerdictBusy, setClaimVerdictBusy] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const keyboardScrollLockRef = viewMode === "chat" ? composerLockScrollYRef : writeLockScrollYRef;
  useLockBodyScrollWhenKeyboardActive(
    (composerFocused && viewMode === "chat") || (writeFocused && viewMode === "write"),
    keyboardScrollLockRef,
  );
  useJournalEntryTextareaAutosize(writeBodyRef, journalBody);

  inputRef.current = input;
  dictInterimRef.current = dictInterim;
  includeGeneralRef.current = includeGeneral;
  responseDepthRef.current = responseDepth;
  voiceRepliesRef.current = voiceReplies;

  useEffect(() => {
    const prev = prevRouteEntryIdRef.current;
    if (prev !== undefined && prev !== routeEntryId) {
      setClaimFocusSession(null);
      setViewMode("chat");
    }
    prevRouteEntryIdRef.current = routeEntryId;
  }, [routeEntryId]);

  const stopJournalTts = useCallback(() => {
    assistantTtsRef.current.stop();
  }, []);

  const playJournalAssistantTts = useCallback(
    async (markdown: string) => {
      await assistantTtsRef.current.play(markdown);
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopJournalTts();
    };
  }, [stopJournalTts]);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);
    const { data, error } = await supabase
      .from("journal_entries")
      .select("id,title,entry_at_ts")
      .eq("user_id", user.id)
      .eq("entry_kind", "chat")
      .order("entry_at_ts", { ascending: false })
      .limit(40);
    if (error) {
      toast({ title: "Could not load sessions", description: error.message, variant: "destructive" });
      setSessions([]);
    } else {
      const rows = (data as { id: string; title: string | null; entry_at_ts: string }[]) ?? [];
      const resolved = await resolveJournalChatSessionTitles(supabase, user.id, rows);
      setSessions(resolved);
    }
    setLoadingSessions(false);
  }, [user]);

  const loadMessages = useCallback(
    async (cId: string) => {
      if (!user) return;
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
    },
    [user],
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    persistJournalChatIncludeGeneral(includeGeneral);
  }, [includeGeneral]);

  useEffect(() => {
    persistResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY, responseDepth);
  }, [responseDepth]);

  useEffect(() => {
    persistJournalChatVoiceReplies(voiceReplies);
  }, [voiceReplies]);

  // Load entry + linked chat for :entryId; bootstrap opener when thread is empty.
  useEffect(() => {
    if (!routeEntryId || !user) return;
    let cancelled = false;
    (async () => {
      const { data: entry, error: enErr } = await supabase
        .from("journal_entries")
        .select("id,title,body,summary,entry_kind,analyze_for_mirror")
        .eq("id", routeEntryId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (enErr || !entry) {
        toast({ title: "Entry not found", variant: "destructive" });
        navigate("/journal", { replace: true });
        return;
      }
      if (entry.entry_kind !== "chat") {
        navigate(`/journal/${routeEntryId}`, { replace: true });
        return;
      }
      setEntryTitle(entry.title ?? "");
      setAnalyzeForMirror(!!entry.analyze_for_mirror);
      const parsedBody = parseChatJournalEntry(
        typeof entry.body === "string" ? entry.body : "",
        (entry as { summary?: string | null }).summary,
      );
      setJournalBody(
        parsedBody.kind === "plain"
          ? (typeof entry.body === "string" ? entry.body : "")
          : parsedBody.summary,
      );

      const { data: chat, error: chErr } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", routeEntryId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      let cId: string;
      if (chErr || !chat?.id) {
        const { data: created, error: insErr } = await supabase
          .from("my_ai_chats")
          .insert({ user_id: user.id, journal_entry_id: routeEntryId })
          .select("id")
          .maybeSingle();
        if (insErr || !created?.id) {
          toast({ title: "Could not attach chat thread", description: insErr?.message, variant: "destructive" });
          return;
        }
        cId = created.id as string;
      } else {
        cId = chat.id as string;
      }
      setChatId(cId);

      const { data: firstMsg, error: fmErr } = await supabase
        .from("my_ai_messages")
        .select("id")
        .eq("chat_id", cId)
        .limit(1);
      if (cancelled) return;
      if (fmErr) {
        toast({ title: "Could not load messages", description: fmErr.message, variant: "destructive" });
        await loadMessages(cId);
        return;
      }
      if (!(firstMsg?.length ?? 0)) {
        setBootstrapping(true);
        const handoff = readAndClearClaimChatHandoff();
        try {
          const seedBody = typeof (entry as { body?: string }).body === "string"
            ? (entry as { body?: string }).body!.trim()
            : "";
          const invokeBody = (() => {
            const base = seedBody
              ? {
                  chat_id: cId,
                  journal_entry_id: routeEntryId,
                  mode: "journal" as const,
                  message: seedBody,
                  include_general_knowledge: includeGeneralRef.current,
                  response_depth: responseDepthRef.current,
                }
              : {
                  chat_id: cId,
                  journal_entry_id: routeEntryId,
                  mode: "journal" as const,
                  journal_bootstrap_opener: true,
                  include_general_knowledge: includeGeneralRef.current,
                  response_depth: responseDepthRef.current,
                };
            if (!seedBody && handoff) {
              return {
                ...base,
                journal_bootstrap_artifact_claim_id: handoff.claimId,
                journal_bootstrap_transcript_excerpt: handoff.transcriptExcerpt ?? null,
              };
            }
            return base;
          })();
          const { data, error } = await supabase.functions.invoke("my-ai-chat", {
            body: { ...invokeBody, stream: false },
          });
          if (cancelled) return;
          if (error) throw new Error(error.message);
          const payload = data as { content?: string; error?: string } | null;
          if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
            throw new Error(payload.error);
          }
          if (
            payload &&
            typeof payload === "object" &&
            typeof payload.content === "string" &&
            payload.content.trim()
          ) {
            void playJournalAssistantTts(payload.content);
          }
          if (!cancelled && handoff) {
            const [{ data: row }, { data: art }] = await Promise.all([
              supabase.from("artifact_claims").select("claim, matched_belief_id").eq("id", handoff.claimId).maybeSingle(),
              supabase.from("artifacts").select("title").eq("id", handoff.artifactId).maybeSingle(),
            ]);
            if (!cancelled) {
              const claimStr = typeof row?.claim === "string" ? row.claim : "";
              setClaimFocusSession({
                claimId: handoff.claimId,
                artifactId: handoff.artifactId,
                claimPreview: claimStr ? claimStr.slice(0, 220) : "Claim",
                matchedBeliefId: typeof row?.matched_belief_id === "string" ? row.matched_belief_id : null,
                artifactTitle: typeof art?.title === "string" ? art.title : null,
              });
              const { data: entRefresh } = await supabase
                .from("journal_entries")
                .select("title")
                .eq("id", routeEntryId)
                .maybeSingle();
              if (!cancelled && typeof entRefresh?.title === "string" && entRefresh.title.trim()) {
                setEntryTitle(entRefresh.title.trim());
              }
            }
          }
        } catch (e) {
          if (handoff) setClaimChatHandoff(handoff);
          if (!cancelled) {
            toast({ title: "Could not start conversation", description: String(e), variant: "destructive" });
          }
        } finally {
          if (!cancelled) setBootstrapping(false);
        }
      }
      await loadMessages(cId);
      if (!cancelled) void loadSessions();
    })();
    return () => {
      cancelled = true;
    };
  }, [routeEntryId, user, navigate, loadMessages, loadSessions, playJournalAssistantTts]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, bootstrapping]);

  useEffect(() => {
    if (!dictationListening || sending || bootstrapping || !routeEntryId || !chatId) return;
    const id = window.setInterval(() => {
      if (!voiceHadFinalSinceMicOnRef.current) return;
      if (sendingRef.current) return;
      if (dictInterimRef.current.trim()) return;
      const t = inputRef.current.trim();
      if (!t) return;
      if (Date.now() - lastDictationFinalAtRef.current < SILENCE_AFTER_FINAL_MS) return;
      void sendRef.current();
    }, 200);
    return () => window.clearInterval(id);
  }, [dictationListening, sending, bootstrapping, routeEntryId, chatId]);

  useEffect(() => {
    if (!voiceReplies) stopJournalTts();
  }, [voiceReplies, stopJournalTts]);

  if (authLoading) {
    return (
      <div className={mobileCenteredScreen("bg-background")}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!routeEntryId) return <Navigate to="/my-ai" replace />;

  const persistTitle = async (next: string) => {
    if (!routeEntryId) return;
    const t = next.trim();
    setEntryTitle(t);
    await supabase
      .from("journal_entries")
      .update({ title: t || null, updated_at: new Date().toISOString() })
      .eq("id", routeEntryId)
      .eq("user_id", user.id);
    void loadSessions();
  };

  const persistJournalBody = async (next: string) => {
    if (!routeEntryId) return;
    setJournalBody(next);
    await supabase
      .from("journal_entries")
      .update({ body: next, updated_at: new Date().toISOString() })
      .eq("id", routeEntryId)
      .eq("user_id", user.id);
  };

  const persistMirror = async (v: boolean) => {
    if (!routeEntryId) return;
    setAnalyzeForMirror(v);
    await supabase
      .from("journal_entries")
      .update({ analyze_for_mirror: v, updated_at: new Date().toISOString() })
      .eq("id", routeEntryId)
      .eq("user_id", user.id);
  };

  const applyClaimVerdict = async (verdict: ClaimVerdict) => {
    if (!user || !claimFocusSession) return;
    setClaimVerdictBusy(true);
    try {
      const deferred_at = verdict === "defer" ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("artifact_claims")
        .update({ verdict, deferred_at })
        .eq("id", claimFocusSession.claimId)
        .eq("user_id", user.id);
      if (error) throw error;
      const label =
        verdict === "keep"
          ? "Marked keep"
          : verdict === "reject"
            ? "Marked reject"
            : verdict === "defer"
              ? "Saved for later"
              : "Marked updated";
      toast({ title: label, description: "You can keep chatting or return to the artifact when you're ready." });
    } catch (e) {
      toast({ title: "Could not update claim", description: String(e), variant: "destructive" });
    } finally {
      setClaimVerdictBusy(false);
    }
  };

  const stop = () => {
    ignoreResult.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    setSending(false);
    stopJournalTts();
  };

  const patchStreamingAssistant = (assistantTempId: string, content: string, citations?: Citation[]) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantTempId
          ? { ...m, content, citations: citations ?? m.citations }
          : m,
      ),
    );
  };

  const startEditMessage = (msgId: string, content: string) => {
    setEditingMessageId(msgId);
    setInput(content);
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? inputRef.current).trim();
    if (!text || sendingRef.current || !chatId || !routeEntryId) return;
    stopJournalTts();
    dictateRef.current?.stop();
    voiceHadFinalSinceMicOnRef.current = false;
    ignoreResult.current = false;

    const editId =
      editingMessageId && !editingMessageId.startsWith("pending-") ? editingMessageId : null;
    const optimisticId = `pending-${Date.now()}`;
    const assistantTempId = `${optimisticId}-assistant`;

    if (editId) {
      const idx = messages.findIndex((m) => m.id === editId);
      const truncated =
        idx >= 0
          ? messages.slice(0, idx + 1).map((m) => (m.id === editId ? { ...m, content: text } : m))
          : messages;
      setMessages([
        ...truncated,
        { id: assistantTempId, role: "assistant", content: "", citations: [] },
      ]);
      setEditingMessageId(null);
    } else {
      setMessages((prev) => [
        ...prev,
        { id: optimisticId, role: "user", content: text, citations: [] },
        { id: assistantTempId, role: "assistant", content: "", citations: [] },
      ]);
    }

    setInput("");
    sendingRef.current = true;
    setSending(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const done = await streamMyAiChat({
        signal: abortRef.current.signal,
        body: {
          chat_id: chatId,
          message: text,
          mode: "journal",
          journal_entry_id: routeEntryId,
          include_general_knowledge: includeGeneral,
          response_depth: responseDepth,
          edit_user_message_id: editId,
        },
        onDelta: (acc) => {
          if (!ignoreResult.current) patchStreamingAssistant(assistantTempId, acc);
        },
      });

      if (ignoreResult.current) return;

      patchStreamingAssistant(assistantTempId, done.content, citationsFromStream(done.citations));
      if (done.title?.trim() && !entryTitle.trim()) {
        const nextTitle = normalizeChatSessionTitle(done.title.trim());
        setEntryTitle(nextTitle);
        await supabase
          .from("journal_entries")
          .update({ title: nextTitle, updated_at: new Date().toISOString() })
          .eq("id", routeEntryId)
          .eq("user_id", user.id);
      }
      await loadMessages(done.chat_id);
      void loadSessions();
      if (done.content.trim()) void playJournalAssistantTts(done.content);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        if (chatId) await loadMessages(chatId);
        return;
      }
      if (!ignoreResult.current) {
        toast({ title: "Message failed", description: String(e), variant: "destructive" });
        setMessages((prev) => prev.filter((m) => !m.id.startsWith("pending-")));
        setInput(text);
      }
    } finally {
      abortRef.current = null;
      sendingRef.current = false;
      if (!ignoreResult.current) setSending(false);
      ignoreResult.current = false;
    }
  };

  const retryLast = async () => {
    if (!chatId || !routeEntryId || sendingRef.current) return;
    stopJournalTts();
    sendingRef.current = true;
    setSending(true);
    ignoreResult.current = false;
    const assistantTempId = `pending-retry-${Date.now()}`;
    setMessages((prev) => {
      let lastAssistantIdx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === "assistant") {
          lastAssistantIdx = i;
          break;
        }
      }
      if (lastAssistantIdx < 0) return prev;
      return [
        ...prev.slice(0, lastAssistantIdx),
        { id: assistantTempId, role: "assistant", content: "", citations: [] },
      ];
    });
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const done = await streamMyAiChat({
        signal: abortRef.current.signal,
        body: {
          chat_id: chatId,
          retry_last: true,
          mode: "journal",
          journal_entry_id: routeEntryId,
          include_general_knowledge: includeGeneral,
          response_depth: responseDepth,
        },
        onDelta: (acc) => patchStreamingAssistant(assistantTempId, acc),
      });
      patchStreamingAssistant(assistantTempId, done.content, citationsFromStream(done.citations));
      await loadMessages(chatId);
      if (done.content.trim()) void playJournalAssistantTts(done.content);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        await loadMessages(chatId);
        return;
      }
      toast({ title: "Retry failed", description: String(e), variant: "destructive" });
      await loadMessages(chatId);
    } finally {
      abortRef.current = null;
      sendingRef.current = false;
      setSending(false);
    }
  };

  const endSession = async () => {
    if (!routeEntryId || ending) return;
    dictateRef.current?.stop();
    stopJournalTts();
    setEnding(true);
    try {
      await saveChatAsJournalEntry({ journalEntryId: routeEntryId });
      if (analyzeForMirror) {
        supabase.functions.invoke("journal-score-entry", { body: { entry_id: routeEntryId } }).catch(() => {});
      }
      navigate(`/journal/${routeEntryId}`);
    } catch (e) {
      toast({ title: "Could not save entry", description: String(e), variant: "destructive" });
    } finally {
      setEnding(false);
    }
  };

  const openSession = (id: string) => {
    setSheetOpen(false);
    navigate(`/journal/chat/${id}`);
  };

  const newSession = () => {
    setSheetOpen(false);
    navigate("/my-ai");
  };

  sendRef.current = send;

  const chatTurnsForCollapsible: InlineChatTurn[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      citations: m.role === "assistant" ? m.citations : undefined,
    }));

  const showLoadingShell = !routeEntryId || !chatId;
  const showChatComposer = viewMode === "chat";
  const visibleMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const lastAssistantId = [...visibleMessages].reverse().find((m) => m.role === "assistant")?.id;
  const streamingAssistantId = sending
    ? [...visibleMessages].reverse().find((m) => m.role === "assistant")?.id ?? null
    : null;
  const showTrailingTyping = bootstrapping && !visibleMessages.some((m) => m.role === "assistant");

  return (
    <div className={cn("flex flex-col overflow-hidden bg-background", hubShellPageHeight(showHubShell))}>
      <header
        className="sticky top-0 z-20 shrink-0 border-b border-border bg-background/90 backdrop-blur-md pt-[calc(var(--safe-area-inset-top)+0.25rem)]"
        style={vvOffsetTop > 0 ? { top: vvOffsetTop } : undefined}
      >
        <div className="flex h-11 items-center gap-1 px-2 sm:gap-2 sm:px-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate("/journal")}
            aria-label="Back to journal"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PrivacyBlurInput
            value={entryTitle}
            onChange={(e) => setEntryTitle(e.target.value)}
            onBlur={() => void persistTitle(entryTitle)}
            placeholder="Session title"
            className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-base font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-[15px]"
          />
          <div
            className="flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5"
            role="tablist"
            aria-label="Journal view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "write"}
              aria-label="Write"
              title="Write"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                viewMode === "write"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setViewMode("write")}
            >
              <PenLine className="h-4 w-4" />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "chat"}
              aria-label="Chat"
              title="Chat"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                viewMode === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setViewMode("chat")}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="More options"
            onClick={() => setHeaderMoreOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <JournalChatSessionsPicker
        variant="sheet-only"
        sessions={sessions}
        loading={loadingSessions}
        activeId={routeEntryId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSelect={openSession}
        onNew={newSession}
      />

      <Sheet open={headerMoreOpen} onOpenChange={setHeaderMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Session options</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 md:hidden"
              onClick={() => {
                setHeaderMoreOpen(false);
                setSheetOpen(true);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Chat sessions
            </Button>
            <div className="flex items-center justify-between gap-3 sm:hidden">
              <span className="text-sm">Privacy blur</span>
              <JournalPrivacyBlurToggle />
            </div>
            <ResponseDepthControl
              idPrefix="jc-depth"
              value={responseDepth}
              onChange={setResponseDepth}
            />
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="jc-outside" className="text-sm">Outside knowledge</Label>
              <Switch
                id="jc-outside"
                checked={includeGeneral}
                onCheckedChange={(v) => setIncludeGeneral(Boolean(v))}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="jc-voice" className="text-sm">Voice replies</Label>
              <Switch
                id="jc-voice"
                checked={voiceReplies}
                onCheckedChange={(v) => setVoiceReplies(Boolean(v))}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="jc-mirror" className="text-sm">Include in worldview mirror</Label>
              <Switch
                id="jc-mirror"
                checked={analyzeForMirror}
                onCheckedChange={(v) => void persistMirror(Boolean(v))}
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="default"
                disabled={ending}
                onClick={() => {
                  setHeaderMoreOpen(false);
                  void endSession();
                }}
              >
                {ending ? "Saving…" : "Save as journal entry"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setHeaderMoreOpen(false);
                  navigate("/journal");
                }}
              >
                Continue later
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="justify-start gap-2"
                onClick={() => navigate(chatId ? `/my-ai/${chatId}` : "/my-ai")}
              >
                <Settings2 className="h-4 w-4" />
                Open in My AI
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {claimFocusSession && routeEntryId && (
        <div className="shrink-0 px-3 sm:px-5">
          <div className="mx-auto max-w-2xl">
            {claimFocusSession.artifactTitle ? (
              <p className="border-b border-primary/15 px-0 pb-1 pt-2 text-xs text-muted-foreground">
                From: {claimFocusSession.artifactTitle}
              </p>
            ) : null}
            <ClaimResearchBar
              claimText={claimFocusSession.claimPreview}
              artifactId={claimFocusSession.artifactId}
              matchedBeliefId={claimFocusSession.matchedBeliefId}
              artifactLinkLabel="Back to artifact"
              showResearchPack={false}
              verdictBusy={claimVerdictBusy}
              onVerdict={(v) => void applyClaimVerdict(v)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[260px] shrink-0 md:flex">
          <JournalChatSessionsPicker
            variant="rail"
            sessions={sessions}
            loading={loadingSessions}
            activeId={routeEntryId}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onSelect={openSession}
            onNew={newSession}
          />
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-4 sm:px-5",
              showChatComposer ? "pb-safe-40" : "pb-safe-8",
            )}
            style={
              writeFocused && viewMode === "write" && kbInset > 0
                ? { paddingBottom: `calc(${kbInset}px + env(safe-area-inset-bottom) + 1rem)` }
                : undefined
            }
          >
            {showLoadingShell && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-60" />
              </div>
            )}

            {!showLoadingShell && viewMode === "write" && (
              <div className="mx-auto max-w-2xl space-y-4 pb-6">
                <PolishedTextarea
                  ref={writeBodyRef}
                  polishResetKey={`${routeEntryId}-write`}
                  value={journalBody}
                  onChange={(e) => setJournalBody(e.target.value)}
                  onPointerDown={() => {
                    writeLockScrollYRef.current = window.scrollY;
                  }}
                  onFocus={() => setWriteFocused(true)}
                  onBlur={() => {
                    setWriteFocused(false);
                    void persistJournalBody(journalBody);
                  }}
                  placeholder="What happened today? What are you carrying?"
                  className={cn(journalPlainWriteFieldClass, "min-h-[40dvh]")}
                />
                {chatTurnsForCollapsible.length > 0 ? (
                  <JournalLiveChatCollapsible turns={chatTurnsForCollapsible} />
                ) : null}
              </div>
            )}

            {!showLoadingShell && viewMode === "chat" && loadingMessages && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-60" />
              </div>
            )}

            {!showLoadingShell && viewMode === "chat" && !loadingMessages && (
              <div className="mx-auto max-w-2xl space-y-6 pb-4">
                <ChatOpeningBlessing variant="transcript" />
                {visibleMessages.map((m) => (
                  <div key={m.id} className={cn("group w-full", m.role === "user" && "flex flex-col items-end")}>
                    {m.role === "user" ? (
                      <>
                        <div className={journalChatUserBubbleClass}>{m.content}</div>
                        {!m.id.startsWith("pending-") ? (
                          <ChatMessageActions
                            role="user"
                            content={m.content}
                            busy={sending || bootstrapping}
                            onEdit={() => startEditMessage(m.id, m.content)}
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className="max-w-none px-1 py-1">
                        {sending && m.id === streamingAssistantId ? (
                          <ChatAssistantMarkdown content={m.content} streaming />
                        ) : m.content ? (
                          <ChatAssistantMarkdown content={m.content} />
                        ) : (
                          <TypingDots />
                        )}
                        {!(sending && m.id === streamingAssistantId) ? (
                          <ChatSourceAttribution citations={m.citations} variant="journal" />
                        ) : null}
                        {!m.id.startsWith("pending-") || m.content ? (
                          <ChatMessageActions
                            role="assistant"
                            content={m.content}
                            busy={sending || bootstrapping}
                            isLastAssistant={m.id === lastAssistantId}
                            onRegenerate={
                              m.id === lastAssistantId && chatId ? () => void retryLast() : undefined
                            }
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}

                {showTrailingTyping && (
                  <div className="px-1 py-1 text-muted-foreground">
                    <TypingDots />
                  </div>
                )}
              </div>
            )}
          </div>

          {showChatComposer && (
            <div
              className={hubShellBottomDock(
                showHubShell,
                cn("z-30 border-t border-border/60 bg-background/95 px-3 pt-2 backdrop-blur-md sm:px-5", !showHubShell && "md:left-[260px]"),
              )}
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
                transform: kbInset ? `translateY(-${kbInset}px)` : undefined,
                transition: "transform 120ms ease-out",
              }}
            >
              <div className="pointer-events-auto mx-auto max-w-2xl">
                {sending && (
                  <div className="mb-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={stop}
                    >
                      <Square className="mr-1 h-3 w-3" /> Stop
                    </Button>
                  </div>
                )}
                <InlineJournalChatComposer
                  value={input}
                  onChange={setInput}
                  onSend={() => void send()}
                  onExit={() => setViewMode("write")}
                  placeholder="Type anything"
                  onPointerDown={() => {
                    composerLockScrollYRef.current = window.scrollY;
                  }}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  aiBusy={sending || bootstrapping || showLoadingShell}
                  includeGeneral={includeGeneral}
                  onIncludeGeneralChange={setIncludeGeneral}
                  responseDepth={responseDepth}
                  onResponseDepthChange={setResponseDepth}
                  onOpenInMyAi={chatId ? () => navigate(`/my-ai/${chatId}`) : undefined}
                  onRetryLast={() => void retryLast()}
                  canRetryLast={messages.some((m) => m.role === "assistant")}
                  dictateControl={
                    <DictateButton
                      ref={dictateRef}
                      userId={user.id}
                      size="md"
                      className="h-9 w-9 shrink-0 rounded-full"
                      onAppend={(chunk) => {
                        setInput((prev) => mergeDictatedText(prev, chunk));
                        lastDictationFinalAtRef.current = Date.now();
                        voiceHadFinalSinceMicOnRef.current = true;
                      }}
                      onInterim={setDictInterim}
                      onListeningChange={(on) => {
                        setDictationListening(on);
                        if (on) voiceHadFinalSinceMicOnRef.current = false;
                      }}
                    />
                  }
                  trailingControls={
                    <Button
                      type="button"
                      size="icon"
                      variant={voiceReplies ? "default" : "ghost"}
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-full",
                        voiceReplies ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Toggle voice replies"
                      aria-pressed={voiceReplies}
                      onClick={() => setVoiceReplies((v) => !v)}
                    >
                      <AudioLines className="h-4 w-4" />
                    </Button>
                  }
                />
                <DictInterimPreview
                  text={dictInterim}
                  className="px-1 text-xs italic leading-relaxed text-muted-foreground/80"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
