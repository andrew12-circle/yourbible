/**
 * Legacy chat-journal sessions (`entry_kind = 'chat'`). New conversations should start at `/my-ai`
 * and use "Save to journal" when done. This route remains for existing chat entries and claim handoff.
 * Same backend as My AI: `my-ai-chat` + `my_ai_messages`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Loader2,
  Menu,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Plus,
  Settings2,
  Square,
  AudioLines,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import AiWritingAssistToggle from "@/components/writing/AiWritingAssistToggle";
import { toast } from "@/hooks/use-toast";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { cn } from "@/lib/utils";
import { readAndClearClaimChatHandoff, setClaimChatHandoff } from "@/lib/journal/claimChatHandoff";
import ClaimResearchBar from "@/components/journal/ClaimResearchBar";
import type { ClaimVerdict } from "@/lib/framework/claimVerdict";
import { saveChatAsJournalEntry } from "@/lib/journal/saveChatAsJournalEntry";
import { useKeyboardInset, useLockBodyScrollWhenKeyboardActive } from "@/hooks/useKeyboardInset";
import ResponseDepthControl from "@/components/journal/ResponseDepthControl";
import { CHAT_ASSISTANT_PROSE_COMPACT, prepareChatMarkdownForDisplay } from "@/lib/journal/prepareChatMarkdownForDisplay";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  persistResponseDepthSetting,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";

const LS_INCLUDE_GENERAL = "journal_chat.include_general";
const LS_VOICE_REPLIES = "journal_chat.voice_replies";

/** Silence after last *final* speech chunk before auto-send (~1.2–1.8s band; mid-phrase pauses use interim text to hold). */
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
  citations: Json;
};

type ClaimFocusSession = {
  claimId: string;
  artifactId: string;
  claimPreview: string;
  matchedBeliefId: string | null;
  artifactTitle: string | null;
};

type MyAiInvokeOk = {
  chat_id: string;
  assistant_message_id: string;
  content: string;
  citations: Citation[];
};

function readIncludeGeneralDefault(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_INCLUDE_GENERAL);
  if (v === "0" || v === "false") return false;
  return true;
}

function readVoiceRepliesDefault(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(LS_VOICE_REPLIES);
  if (v === "1" || v === "true") return true;
  return false;
}

function stripMarkdownForTts(md: string): string {
  let s = md;
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  s = s.replace(/^\s*#{1,6}\s+/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseCitationsJson(raw: Json): Citation[] {
  if (!Array.isArray(raw)) return [];
  const out: Citation[] = [];
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

function citationHref(c: Citation): string | null {
  if (c.id) {
    if (c.source_type === "belief") return `/framework/beliefs/${c.id}`;
    if (c.source_type === "journal") return `/journal/${c.id}`;
    if (c.source_type === "artifact") return `/framework/artifacts/${c.id}`;
  }
  if (c.source_type === "identity") return "/settings";
  if (c.source_type === "influence") return "/framework/influences";
  return null;
}

function CitationChips({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.map((c, i) => {
        const href = citationHref(c);
        const chip = (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
              href
                ? "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-muted/50 text-muted-foreground",
            )}
          >
            {c.label}
          </span>
        );
        return href ? (
          <Link key={`${c.source_type}-${c.id ?? "x"}-${i}`} to={href} className="no-underline">
            {chip}
          </Link>
        ) : (
          <span key={`${c.source_type}-${c.id ?? "x"}-${i}`}>{chip}</span>
        );
      })}
    </div>
  );
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
  const navigate = useNavigate();
  const { entryId: routeEntryId } = useParams<{ entryId?: string }>();
  const kbInset = useKeyboardInset();
  const [composerFocused, setComposerFocused] = useState(false);

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
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const composerLockScrollYRef = useRef<number | null>(null);
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
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsObjectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const sendRef = useRef<(textOverride?: string) => Promise<void>>(async () => {});
  const prevRouteEntryIdRef = useRef<string | undefined>(undefined);
  const [claimFocusSession, setClaimFocusSession] = useState<ClaimFocusSession | null>(null);
  const [claimVerdictBusy, setClaimVerdictBusy] = useState(false);
  useLockBodyScrollWhenKeyboardActive(composerFocused, composerLockScrollYRef);

  inputRef.current = input;
  dictInterimRef.current = dictInterim;
  includeGeneralRef.current = includeGeneral;
  responseDepthRef.current = responseDepth;
  voiceRepliesRef.current = voiceReplies;

  useEffect(() => {
    const prev = prevRouteEntryIdRef.current;
    if (prev !== undefined && prev !== routeEntryId) {
      setClaimFocusSession(null);
    }
    prevRouteEntryIdRef.current = routeEntryId;
  }, [routeEntryId]);

  const stopJournalTts = useCallback(() => {
    const a = ttsAudioRef.current;
    ttsAudioRef.current = null;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    const u = ttsObjectUrlRef.current;
    ttsObjectUrlRef.current = null;
    if (u) URL.revokeObjectURL(u);
  }, []);

  const playJournalAssistantTts = useCallback(
    async (markdown: string) => {
      if (!voiceRepliesRef.current) return;
      const text = stripMarkdownForTts(markdown);
      if (!text) return;
      stopJournalTts();
      try {
        const { data, error } = await supabase.functions.invoke<ArrayBuffer>("sleep-tts", {
          body: { text: text.slice(0, 4500) },
        });
        if (error) return;
        if (!mountedRef.current || !voiceRepliesRef.current) return;
        const buf = data as unknown;
        if (!(buf instanceof ArrayBuffer) || buf.byteLength === 0) return;
        const blob = new Blob([buf], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        ttsObjectUrlRef.current = url;
        const audio = new Audio(url);
        ttsAudioRef.current = audio;
        await audio.play().catch(() => {});
      } catch {
        /* ignore TTS failures */
      }
    },
    [stopJournalTts],
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
      setSessions((data as { id: string; title: string | null; entry_at_ts: string }[]) ?? []);
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
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_INCLUDE_GENERAL, includeGeneral ? "1" : "0");
  }, [includeGeneral]);

  useEffect(() => {
    persistResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY, responseDepth);
  }, [responseDepth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_VOICE_REPLIES, voiceReplies ? "1" : "0");
  }, [voiceReplies]);

  // Load entry + linked chat for :entryId; bootstrap opener when thread is empty.
  useEffect(() => {
    if (!routeEntryId || !user) return;
    let cancelled = false;
    (async () => {
      const { data: entry, error: enErr } = await supabase
        .from("journal_entries")
        .select("id,title,body,entry_kind,analyze_for_mirror")
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
          const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
            body: invokeBody,
          });
          if (cancelled) return;
          if (error) throw new Error(error.message);
          const payload = data as MyAiInvokeOk | { error?: string } | null;
          if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
            throw new Error(payload.error);
          }
          if (
            payload &&
            typeof payload === "object" &&
            "content" in payload &&
            typeof (payload as MyAiInvokeOk).content === "string" &&
            (payload as MyAiInvokeOk).content.trim()
          ) {
            void playJournalAssistantTts((payload as MyAiInvokeOk).content);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    sendingRef.current = false;
    setSending(false);
    stopJournalTts();
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? inputRef.current).trim();
    if (!text || sendingRef.current || !chatId || !routeEntryId) return;
    stopJournalTts();
    dictateRef.current?.stop();
    voiceHadFinalSinceMicOnRef.current = false;
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
          journal_entry_id: routeEntryId,
          include_general_knowledge: includeGeneral,
          response_depth: responseDepth,
        },
      });

      if (ignoreResult.current) return;

      if (error) {
        throw new Error(error.message);
      }

      const payload = data as MyAiInvokeOk | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      if (!payload || typeof payload !== "object" || !("chat_id" in payload) || !payload.chat_id) {
        throw new Error("Unexpected response from chat");
      }

      await loadMessages(payload.chat_id);
      void loadSessions();
      const reply = typeof payload.content === "string" ? payload.content : "";
      if (reply.trim()) void playJournalAssistantTts(reply);
    } catch (e) {
      if (!ignoreResult.current) {
        toast({ title: "Message failed", description: String(e), variant: "destructive" });
        setInput(text);
      }
    } finally {
      sendingRef.current = false;
      if (!ignoreResult.current) setSending(false);
      ignoreResult.current = false;
      setTimeout(() => {
        composerLockScrollYRef.current = window.scrollY;
        taRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  };

  const retryLast = async () => {
    if (!chatId || !routeEntryId || sendingRef.current) return;
    stopJournalTts();
    sendingRef.current = true;
    setSending(true);
    ignoreResult.current = false;
    try {
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: chatId,
          retry_last: true,
          mode: "journal",
          journal_entry_id: routeEntryId,
          include_general_knowledge: includeGeneral,
          response_depth: responseDepth,
        },
      });
      if (error) throw new Error(error.message);
      const payload = data as MyAiInvokeOk | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      await loadMessages(chatId);
      const reply =
        payload && typeof payload === "object" && typeof (payload as MyAiInvokeOk).content === "string"
          ? (payload as MyAiInvokeOk).content
          : "";
      if (reply.trim()) void playJournalAssistantTts(reply);
    } catch (e) {
      toast({ title: "Retry failed", description: String(e), variant: "destructive" });
    } finally {
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

  const rail = (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chat journals</span>
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={newSession}>
          <MessageCircle className="h-3.5 w-3.5" /> New
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadingSessions ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-60" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">No chat sessions yet.</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 border-b border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/60",
                routeEntryId === s.id && "bg-muted/80",
              )}
              onClick={() => openSession(s.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{s.title?.trim() || "Untitled"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const showLoadingShell = !routeEntryId || !chatId;

  return (
    <div className="flex h-[100dvh] overflow-hidden flex-col bg-background">
      <header className="sticky top-0 z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background/90 px-3 pb-2 pt-[calc(var(--safe-area-inset-top)+0.5rem)] backdrop-blur-md">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/journal")} aria-label="Back to journal">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
          <Input
            value={entryTitle}
            onChange={(e) => setEntryTitle(e.target.value)}
            onBlur={() => void persistTitle(entryTitle)}
            placeholder="Session title"
            className="h-9 max-w-md border-border/80 text-[15px] font-semibold tracking-tight"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AiWritingAssistToggle compact />
          <Button type="button" variant="outline" size="sm" className="text-xs" disabled={ending} onClick={() => void endSession()}>
            {ending ? "Saving…" : "Save as journal entry"}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/journal")}>
            Continue later
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 h-9 w-9" aria-label="Session settings">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
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
                  <Label htmlFor="jc-voice" className="text-sm">Voice replies (ElevenLabs)</Label>
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
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mirror analysis runs when you end the session if this is on. Vents are never mixed into AI context.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden shrink-0" aria-label="Open sessions">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,320px)] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Chat journals</SheetTitle>
            </SheetHeader>
            <div className="h-[100dvh]">{rail}</div>
          </SheetContent>
        </Sheet>
      </header>

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
        <aside className="hidden w-[260px] shrink-0 md:flex">{rail}</aside>

        <section className="relative flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-safe-40 sm:px-5">
            {showLoadingShell && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-60" />
              </div>
            )}

            {!showLoadingShell && loadingMessages && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-60" />
              </div>
            )}

            {!showLoadingShell && !loadingMessages && (
              <div className="mx-auto max-w-2xl space-y-3 pb-4">
                {messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => (
                  <div key={m.id} className={cn(m.role === "user" && "flex justify-end")}>
                    {m.role === "user" ? (
                      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground shadow-sm whitespace-pre-wrap">
                        {m.content}
                      </div>
                    ) : (
                      <div className="max-w-full px-1 py-1 text-[13px]">
                        <div className={CHAT_ASSISTANT_PROSE_COMPACT}>
                          {m.content ? (
                            <ReactMarkdown>{prepareChatMarkdownForDisplay(m.content)}</ReactMarkdown>
                          ) : (
                            <TypingDots />
                          )}
                        </div>
                        <CitationChips citations={parseCitationsJson(m.citations)} />
                      </div>
                    )}
                  </div>
                ))}

                {(sending || bootstrapping) && (
                  <div className="px-1 py-1 text-muted-foreground">
                    <TypingDots />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Floating composer — fixed to viewport so it always stays in view */}
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pt-6 sm:px-5 md:left-[260px]"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
              transform: kbInset ? `translateY(-${kbInset}px)` : undefined,
              transition: "transform 120ms ease-out",
            }}
          >
            <div className="pointer-events-auto mx-auto max-w-2xl">
              {(messages.some((m) => m.role === "assistant") || sending) && (
                <div className="mb-2 flex justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full bg-background/90 px-3 text-xs shadow-sm backdrop-blur"
                    disabled={sending || !messages.some((m) => m.role === "assistant")}
                    onClick={() => void retryLast()}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" /> Retry last
                  </Button>
                  {sending && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full bg-background/90 px-3 text-xs shadow-sm backdrop-blur"
                      onClick={stop}
                    >
                      <Square className="mr-1 h-3 w-3" /> Stop
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-end gap-2 rounded-[28px] border border-border bg-background/95 px-2 py-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Add"
                  disabled
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <PolishedTextarea
                  polishResetKey={routeEntryId ?? chatId ?? "journal-chat"}
                  ref={taRef}
                  value={input}
                  onPointerDown={() => {
                    composerLockScrollYRef.current = window.scrollY;
                  }}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!sending) void send();
                    }
                  }}
                  rows={1}
                  disabled={sending || bootstrapping || showLoadingShell}
                  placeholder={sending || bootstrapping ? "Thinking…" : `Message ${entryTitle.trim() || "session"}`}
                  className="min-h-[36px] max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[16px] leading-snug shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
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
                  <AudioLines className="h-5 w-5" />
                </Button>
              </div>
              {dictInterim.trim() ? (
                <p
                  className="mt-1.5 px-3 text-xs italic leading-relaxed text-muted-foreground/80"
                  aria-live="polite"
                >
                  {dictInterim}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
