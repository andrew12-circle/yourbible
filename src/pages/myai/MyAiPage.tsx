import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Brain,
  Loader2,
  Menu,
  PanelLeft,
  Plus,
  Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { useVisualViewportMetrics, useLockBodyScrollWhenKeyboardActive } from "@/hooks/useKeyboardInset";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MyAiComposer from "@/components/myai/MyAiComposer";
import MyAiChatSidebar from "@/components/myai/MyAiChatSidebar";
import MyAiWelcomeHero from "@/components/myai/MyAiWelcomeHero";
import { saveChatAsJournalEntry } from "@/lib/journal/saveChatAsJournalEntry";
import ResponseDepthControl from "@/components/journal/ResponseDepthControl";
import ChatAssistantMarkdown from "@/components/journal/ChatAssistantMarkdown";
import ChatMessageActions from "@/components/journal/ChatMessageActions";
import ChatSourceAttribution from "@/components/journal/ChatSourceAttribution";
import ChatOpeningBlessing from "@/components/journal/ChatOpeningBlessing";
import { chatTitleFromFirstMessage } from "@/lib/myai/chatTitle";
import { streamMyAiChat, type MyAiChatCitation } from "@/lib/myai/invokeMyAiChat";
import type { MyAiResearchScope } from "@/lib/myai/researchScope";
import {
  buildMyAiTurnBody,
  MY_AI_COMPANION_MODE_HINTS,
  MY_AI_COMPANION_MODE_LABELS,
  persistCompanionModeSetting,
  readCompanionModeSetting,
  type MyAiCompanionMode,
} from "@/lib/myai/companionMode";
import { myAiComposerColumn } from "@/lib/myai/myAiTheme";
import { resolveProfileDisplayName } from "@/lib/profile/displayName";
import {
  MY_AI_RESPONSE_DEPTH_STORAGE_KEY,
  persistResponseDepthSetting,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";
import { loadMyAiChatsForSidebar } from "@/lib/myai/loadMyAiChats";
import { resolveUntitledChats } from "@/lib/myai/resolveChatTitles";
import type { MyAiChatListItem, MyAiProjectRow } from "@/lib/myai/chatSections";
import { mobileCenteredScreen, mobileVisualViewportPageStyle } from "@/lib/shell/mobileShellClasses";
import {
  createMyAiProject,
  deleteMyAiProject,
  isMyAiProjectsTableMissing,
  listMyAiProjects,
  moveChatToProject as persistChatProject,
} from "@/lib/myai/chatProjects";

/** Canonical framework-grounded AI chat. Journal inline/legacy chat journals use the same `my-ai-chat` backend. */
const LS_INCLUDE_GENERAL = "my_ai.include_general";
const LS_SIDEBAR = "my_ai.sidebar_open";

type ChatRow = MyAiChatListItem;

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

const SUGGESTED_PROMPTS = [
  "Summarize what I believe about prayer.",
  "What scriptures keep coming up for me?",
  "Where do my beliefs contradict each other?",
  "Who are the biggest influences in my journey?",
];

function readIncludeGeneralDefault(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_INCLUDE_GENERAL);
  if (v === "0" || v === "false") return false;
  return true;
}

function readSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_SIDEBAR);
  if (v === "0" || v === "false") return false;
  return true;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type CognitiveState = {
  worldview_summary: string | null;
  evolution_summary: string | null;
  current_season: string | null;
  voice_signature: string | null;
  recurring_themes: string[] | null;
  unresolved_tensions: string[] | null;
  core_frameworks: Json | null;
  updated_at: string | null;
};

function CognitiveStateDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [state, setState] = useState<CognitiveState | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMissing(false);
      const { data, error } = await supabase
        .from("user_cognitive_state")
        .select("worldview_summary,evolution_summary,current_season,voice_signature,recurring_themes,unresolved_tensions,core_frameworks,updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: "Couldn't load state", description: error.message, variant: "destructive" });
      }
      if (!data) setMissing(true);
      setState((data as CognitiveState | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const frameworks = (() => {
    const cf = state?.core_frameworks;
    if (!cf) return [];
    if (Array.isArray(cf)) {
      return cf.flatMap((x) => {
        if (typeof x === "string") return [{ name: x, description: "" }];
        if (isRecord(x)) {
          const name = typeof x.name === "string" ? x.name : null;
          const desc = typeof x.description === "string" ? x.description : "";
          return name ? [{ name, description: desc }] : [];
        }
        return [];
      });
    }
    return [];
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-300" />
            What My AI knows about you
          </DialogTitle>
          <DialogDescription>
            A living model of your worldview, voice, and evolution. Updated nightly from your beliefs, journals, and artifacts.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : missing || !state ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No cognitive state yet. It will be built after your next sweep.
          </p>
        ) : (
          <div className="space-y-5 text-sm">
            {state.current_season && (
              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Current season</h3>
                <p className="rounded-lg border border-border/70 bg-muted/30 p-3 italic">{state.current_season}</p>
              </section>
            )}

            {state.worldview_summary && (
              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Worldview</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{state.worldview_summary}</ReactMarkdown>
                </div>
              </section>
            )}

            {state.evolution_summary && (
              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evolution</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{state.evolution_summary}</ReactMarkdown>
                </div>
              </section>
            )}

            {state.voice_signature && (
              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Voice signature</h3>
                <p className="rounded-lg border border-border/70 bg-muted/30 p-3 text-muted-foreground">{state.voice_signature}</p>
              </section>
            )}

            {state.recurring_themes && state.recurring_themes.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recurring themes</h3>
                <div className="flex flex-wrap gap-1.5">
                  {state.recurring_themes.map((t, i) => (
                    <span key={i} className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[11px] text-primary">
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {state.unresolved_tensions && state.unresolved_tensions.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unresolved tensions</h3>
                <ul className="space-y-1.5">
                  {state.unresolved_tensions.map((t, i) => (
                    <li key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[13px]">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {frameworks.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Core frameworks</h3>
                <ul className="space-y-1.5">
                  {frameworks.map((f, i) => (
                    <li key={i} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                      <div className="font-medium">{f.name}</div>
                      {f.description && <div className="text-[12px] text-muted-foreground">{f.description}</div>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {state.updated_at && (
              <p className="pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Updated {new Date(state.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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

export default function MyAiPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const navigate = useNavigate();
  const { chatId: routeChatId } = useParams<{ chatId: string }>();
  const { keyboardInset: kbInset, offsetTop: vvOffsetTop, viewportHeight } = useVisualViewportMetrics();
  const [composerFocused, setComposerFocused] = useState(false);

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [projects, setProjects] = useState<MyAiProjectRow[]>([]);
  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [companionMode, setCompanionMode] = useState<MyAiCompanionMode>(() => readCompanionModeSetting());
  const [responseDepth, setResponseDepth] = useState<ResponseDepthSetting>(() =>
    readResponseDepthSetting(MY_AI_RESPONSE_DEPTH_STORAGE_KEY, "deep"),
  );
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composerLockScrollYRef = useRef<number | null>(null);

  useLockBodyScrollWhenKeyboardActive(composerFocused, composerLockScrollYRef);

  const persistSidebar = (open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem(LS_SIDEBAR, open ? "1" : "0");
  };

  const loadProjects = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await listMyAiProjects(supabase, user.id);
      setProjects(rows);
    } catch (e) {
      const message = String(e);
      if (!isMyAiProjectsTableMissing(message)) {
        toast({ title: "Could not load folders", description: message, variant: "destructive" });
      }
      setProjects([]);
    }
  }, [user]);

  const loadChats = useCallback(async () => {
    if (!user) return;
    setLoadingChats(true);
    const { rows, error } = await loadMyAiChatsForSidebar(supabase, user.id);
    if (error) {
      toast({ title: "Could not load chats", description: error, variant: "destructive" });
      setChats([]);
    } else {
      const resolved = await resolveUntitledChats(supabase, user.id, rows);
      setChats(resolved);
    }
    setLoadingChats(false);
  }, [user]);

  const loadMessages = useCallback(
    async (id: string) => {
      if (!user) return;
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("my_ai_messages")
        .select("id,role,content,citations")
        .eq("chat_id", id)
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
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!routeChatId) {
      setMessages([]);
      return;
    }
    void loadMessages(routeChatId);
  }, [routeChatId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: sending ? "auto" : "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_INCLUDE_GENERAL, includeGeneral ? "1" : "0");
  }, [includeGeneral]);

  useEffect(() => {
    persistCompanionModeSetting(companionMode);
  }, [companionMode]);

  useEffect(() => {
    persistResponseDepthSetting(MY_AI_RESPONSE_DEPTH_STORAGE_KEY, responseDepth);
  }, [responseDepth]);

  if (authLoading) {
    return (
      <div className={mobileCenteredScreen("bg-background")}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const visibleMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const showWelcome = !loadingMessages && visibleMessages.length === 0;
  const welcomeDisplayName = resolveProfileDisplayName(profile, user);
  const keyboardViewportPage = !showHubShell && kbInset > 0;
  const lastAssistantId = [...visibleMessages].reverse().find((m) => m.role === "assistant")?.id;
  const streamingAssistantId = sending
    ? [...visibleMessages].reverse().find((m) => m.role === "assistant")?.id ?? null
    : null;

  const stopGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
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
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const openChat = (id: string) => {
    setMobileSheetOpen(false);
    navigate(`/my-ai/${id}`);
  };

  const newChat = () => {
    setMobileSheetOpen(false);
    navigate("/my-ai");
    setMessages([]);
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const deleteChat = async (id: string, e?: MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    const { error } = await supabase.from("my_ai_chats").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setChats((c) => c.filter((x) => x.id !== id));
    if (routeChatId === id) newChat();
    else void loadChats();
  };

  const createProject = async () => {
    if (!user) return;
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    try {
      const row = await createMyAiProject(supabase, user.id, name.trim(), projects.length);
      setProjects((prev) => [...prev, row]);
      setActiveProjectFilter(row.id);
    } catch (e) {
      toast({ title: "Could not create folder", description: String(e), variant: "destructive" });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;
    if (!confirm("Delete this folder? Chats will stay in your history.")) return;
    try {
      await deleteMyAiProject(supabase, user.id, projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProjectFilter === projectId) setActiveProjectFilter(null);
      setChats((prev) =>
        prev.map((c) => (c.project_id === projectId ? { ...c, project_id: null } : c)),
      );
    } catch (e) {
      toast({ title: "Could not delete folder", description: String(e), variant: "destructive" });
    }
  };

  const moveChatToProject = async (chatId: string, projectId: string | null) => {
    if (!user) return;
    try {
      await persistChatProject(supabase, user.id, chatId, projectId);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, project_id: projectId } : c)),
      );
    } catch (e) {
      toast({ title: "Could not move chat", description: String(e), variant: "destructive" });
    }
  };

  const saveAsJournalEntry = async () => {
    if (!routeChatId || savingJournal) return;
    const hasDialogue = messages.some((m) => m.role === "user" || m.role === "assistant");
    if (!hasDialogue) {
      toast({ title: "Nothing to save yet", description: "Send a message first.", variant: "destructive" });
      return;
    }
    setSavingJournal(true);
    try {
      const { entryId } = await saveChatAsJournalEntry({ chatId: routeChatId });
      toast({ title: "Saved to journal", description: "Your conversation is now a journal entry." });
      navigate(`/journal/${entryId}`);
    } catch (e) {
      toast({ title: "Could not save", description: String(e), variant: "destructive" });
    } finally {
      setSavingJournal(false);
    }
  };

  const send = async (textOverride?: string, scope?: MyAiResearchScope) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    const scopeFlags = buildMyAiTurnBody(scope, { companionMode, includeGeneral, responseDepth });

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
    setSending(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const done = await streamMyAiChat({
        signal: abortRef.current.signal,
        body: {
          chat_id: routeChatId ?? null,
          message: text,
          edit_user_message_id: editId,
          ...scopeFlags,
        },
        onDelta: (acc) => patchStreamingAssistant(assistantTempId, acc),
      });

      patchStreamingAssistant(assistantTempId, done.content, citationsFromStream(done.citations));

      const chatTitle = done.title?.trim() || chatTitleFromFirstMessage(text);
      const chatId = done.chat_id;
      const now = new Date().toISOString();
      const targetProjectId = activeProjectFilter;

      if (targetProjectId) {
        await persistChatProject(supabase, user.id, chatId, targetProjectId);
      }

      setChats((prev) => {
        const existing = prev.find((c) => c.id === chatId);
        const nextRow: ChatRow = {
          id: chatId,
          title: chatTitle,
          updated_at: now,
          project_id: targetProjectId ?? existing?.project_id ?? null,
          journal_entry_id: existing?.journal_entry_id ?? null,
        };
        if (existing) {
          return prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  title: c.title?.trim() ? c.title : chatTitle,
                  updated_at: now,
                  project_id: targetProjectId ?? c.project_id,
                }
              : c,
          );
        }
        return [nextRow, ...prev];
      });

      if (!routeChatId || routeChatId !== chatId) {
        navigate(`/my-ai/${chatId}`, { replace: !routeChatId });
      }
      await loadMessages(chatId);
      void loadChats();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        if (routeChatId) await loadMessages(routeChatId);
        return;
      }
      toast({ title: "My AI failed", description: String(e), variant: "destructive" });
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("pending-")));
      setInput(text);
    } finally {
      abortRef.current = null;
      setSending(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const retryWithScope = async (scope?: MyAiResearchScope) => {
    if (!routeChatId || sending) return;
    const scopeFlags = buildMyAiTurnBody(scope, { companionMode, includeGeneral, responseDepth });
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
    setSending(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const done = await streamMyAiChat({
        signal: abortRef.current.signal,
        body: {
          chat_id: routeChatId,
          retry_last: true,
          ...scopeFlags,
        },
        onDelta: (acc) => patchStreamingAssistant(assistantTempId, acc),
      });
      patchStreamingAssistant(assistantTempId, done.content, citationsFromStream(done.citations));
      await loadMessages(routeChatId);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        await loadMessages(routeChatId);
        return;
      }
      toast({ title: "Regenerate failed", description: String(e), variant: "destructive" });
      await loadMessages(routeChatId);
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  };

  const retryLast = () => void retryWithScope();

  const handleResearchScope = (scope: MyAiResearchScope) => {
    const text = input.trim();
    if (text) {
      void send(text, scope);
      return;
    }
    if (routeChatId && visibleMessages.some((m) => m.role === "user")) {
      void retryWithScope(scope);
      return;
    }
    toast({
      title: "Ask something first",
      description: "Type a question to send, or continue a chat before searching wider.",
    });
  };

  const sidebarContent = (
    <MyAiChatSidebar
      chats={chats}
      projects={projects}
      loading={loadingChats}
      activeChatId={routeChatId}
      activeProjectFilter={activeProjectFilter}
      onSelectChat={openChat}
      onNewChat={newChat}
      onNewProject={() => void createProject()}
      onDeleteChat={(id, e) => void deleteChat(id, e)}
      onMoveChatToProject={(chatId, projectId) => void moveChatToProject(chatId, projectId)}
      onSelectProjectFilter={setActiveProjectFilter}
      onDeleteProject={(projectId) => void deleteProject(projectId)}
      onCloseSidebar={() => persistSidebar(false)}
    />
  );

  return (
    <div
      className={cn("flex flex-col overflow-hidden bg-background", showHubShell ? "h-full min-h-0" : "h-[100dvh]")}
      style={mobileVisualViewportPageStyle({
        keyboardInset: kbInset,
        offsetTop: vvOffsetTop,
        viewportHeight,
        enabled: keyboardViewportPage,
      })}
    >
      <CognitiveStateDialog open={stateOpen} onOpenChange={setStateOpen} userId={user.id} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="hidden w-[252px] shrink-0 p-2 pr-1 md:flex">{sidebarContent}</aside>
        )}

        <section className="relative flex min-w-0 flex-1 flex-col bg-background">
          <header
            className={cn(
              "sticky top-0 z-20 flex shrink-0 items-center justify-between gap-2 bg-background/90 px-2 pb-2 backdrop-blur-md sm:px-3",
              showHubShell ? "pt-2" : "pt-[calc(var(--safe-area-inset-top)+0.5rem)]",
            )}
            style={!keyboardViewportPage && vvOffsetTop > 0 ? { top: vvOffsetTop } : undefined}
          >
            <div className="flex min-w-0 items-center gap-0.5">
              {!showHubShell && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/home")} aria-label="Back home">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}

              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 md:hidden" aria-label="Open chats">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(100%,300px)] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Chats</SheetTitle>
                  </SheetHeader>
                  <div className="h-full">{sidebarContent}</div>
                </SheetContent>
              </Sheet>

              {!sidebarOpen && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden h-9 w-9 shrink-0 md:inline-flex"
                  onClick={() => persistSidebar(true)}
                  aria-label="Open sidebar"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 md:hidden"
                onClick={newChat}
                aria-label="New chat"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex min-w-0 items-center gap-0.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Chat settings">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="my-ai-inward-pop" className="text-sm">
                          {MY_AI_COMPANION_MODE_LABELS.inward}
                        </Label>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {MY_AI_COMPANION_MODE_HINTS.inward}
                        </p>
                      </div>
                      <Switch
                        id="my-ai-inward-pop"
                        checked={companionMode === "inward"}
                        onCheckedChange={(v) => setCompanionMode(v ? "inward" : "chatgpt")}
                      />
                    </div>
                    {companionMode === "inward" ? (
                      <>
                        <ResponseDepthControl
                          idPrefix="my-ai-depth"
                          value={responseDepth}
                          onChange={setResponseDepth}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="my-ai-outside-pop" className="text-sm">Outside knowledge</Label>
                          <Switch
                            id="my-ai-outside-pop"
                            checked={includeGeneral}
                            onCheckedChange={(v) => setIncludeGeneral(Boolean(v))}
                          />
                        </div>
                      </>
                    ) : (
                      <ResponseDepthControl
                        idPrefix="my-ai-depth"
                        value={responseDepth}
                        onChange={setResponseDepth}
                      />
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="What My AI knows about you"
                onClick={() => setStateOpen(true)}
              >
                <Brain className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </header>

          {showWelcome ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-safe sm:px-4">
              <div className={cn(myAiComposerColumn, "w-full")}>
                <MyAiWelcomeHero displayName={welcomeDisplayName} className="mb-8" />
                <MyAiComposer
                  layout="center"
                  input={input}
                  onInputChange={setInput}
                  onSend={() => void send()}
                  onResearchScope={handleResearchScope}
                  onStop={sending ? stopGeneration : undefined}
                  sending={sending}
                  editingMessageId={editingMessageId}
                  onCancelEdit={() => {
                    setEditingMessageId(null);
                    setInput("");
                  }}
                  userId={user.id}
                  textareaRef={taRef}
                  responseDepth={responseDepth}
                  onResponseDepthChange={setResponseDepth}
                  companionMode={companionMode}
                  onCompanionModeChange={setCompanionMode}
                  includeGeneral={includeGeneral}
                  onIncludeGeneralChange={setIncludeGeneral}
                  suggestedPrompts={SUGGESTED_PROMPTS}
                  onSuggestedPrompt={(prompt) => void send(prompt)}
                  canSaveJournal={Boolean(routeChatId && visibleMessages.length > 0)}
                  onSaveJournal={() => void saveAsJournalEntry()}
                  savingJournal={savingJournal}
                  onNewChat={newChat}
                  onOpenCognitiveState={() => setStateOpen(true)}
                  keyboardInset={keyboardViewportPage ? 0 : kbInset}
                  onComposerPointerDown={() => {
                    composerLockScrollYRef.current = window.scrollY;
                  }}
                  onComposerFocus={() => setComposerFocused(true)}
                  onComposerBlur={() => setComposerFocused(false)}
                  welcomeQuickPrompts={SUGGESTED_PROMPTS.slice(0, 3)}
                  onWelcomeQuickPrompt={(prompt) => void send(prompt)}
                />
              </div>
            </div>
          ) : (
            <>
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-6 pb-safe-40 sm:px-4"
          >
            {routeChatId && loadingMessages && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
              </div>
            )}

            {!loadingMessages && visibleMessages.length > 0 && (
              <div className="mx-auto w-full max-w-2xl space-y-6 pb-6">
                <ChatOpeningBlessing variant="transcript" />
                {visibleMessages.map((m) => (
                  <div key={m.id} className="group w-full">
                    {m.role === "user" ? (
                      <div className="flex flex-col items-end">
                        <div className="max-w-[min(100%,36rem)] rounded-2xl bg-blue-500/10 px-3.5 py-2.5 text-sm leading-relaxed text-foreground ring-1 ring-blue-500/15 dark:bg-blue-500/15">
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                        {!m.id.startsWith("pending-") ? (
                          <ChatMessageActions
                            role="user"
                            content={m.content}
                            busy={sending}
                            onEdit={() => startEditMessage(m.id, m.content)}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="max-w-none px-1 sm:px-2">
                        {sending && m.id === streamingAssistantId ? (
                          <ChatAssistantMarkdown content={m.content} streaming />
                        ) : m.content ? (
                          <ChatAssistantMarkdown content={m.content} />
                        ) : (
                          <TypingDots />
                        )}
                        {!(sending && m.id === streamingAssistantId) ? (
                          <ChatSourceAttribution citations={m.citations} variant="myai" />
                        ) : null}
                        {!m.id.startsWith("pending-") || m.content ? (
                          <ChatMessageActions
                            role="assistant"
                            content={m.content}
                            busy={sending}
                            isLastAssistant={m.id === lastAssistantId}
                            onRegenerate={
                              m.id === lastAssistantId && routeChatId
                                ? () => void retryLast()
                                : undefined
                            }
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <MyAiComposer
            layout="dock"
            input={input}
            onInputChange={setInput}
            onSend={() => void send()}
            onResearchScope={handleResearchScope}
            onStop={sending ? stopGeneration : undefined}
            sending={sending}
            editingMessageId={editingMessageId}
            onCancelEdit={() => {
              setEditingMessageId(null);
              setInput("");
            }}
            userId={user.id}
            textareaRef={taRef}
            responseDepth={responseDepth}
            onResponseDepthChange={setResponseDepth}
            companionMode={companionMode}
            onCompanionModeChange={setCompanionMode}
            includeGeneral={includeGeneral}
            onIncludeGeneralChange={setIncludeGeneral}
            suggestedPrompts={SUGGESTED_PROMPTS}
            onSuggestedPrompt={(prompt) => void send(prompt)}
            canSaveJournal={Boolean(routeChatId && visibleMessages.length > 0)}
            onSaveJournal={() => void saveAsJournalEntry()}
            savingJournal={savingJournal}
            onNewChat={newChat}
            onOpenCognitiveState={() => setStateOpen(true)}
            keyboardInset={keyboardViewportPage ? 0 : kbInset}
            onComposerPointerDown={() => {
              composerLockScrollYRef.current = window.scrollY;
            }}
            onComposerFocus={() => setComposerFocused(true)}
            onComposerBlur={() => setComposerFocused(false)}
          />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
