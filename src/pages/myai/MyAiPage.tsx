import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Brain,
  Loader2,
  Menu,
  MessageCircle,
  NotebookPen,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MyAiComposer from "@/components/myai/MyAiComposer";
import { saveChatAsJournalEntry } from "@/lib/journal/saveChatAsJournalEntry";
import ResponseDepthControl from "@/components/journal/ResponseDepthControl";
import {
  CHAT_ASSISTANT_PROSE_COMPACT,
  prepareChatMarkdownForDisplay,
} from "@/lib/journal/prepareChatMarkdownForDisplay";
import { MyAiMark } from "@/components/myai/MyAiMark";
import {
  MY_AI_RESPONSE_DEPTH_STORAGE_KEY,
  persistResponseDepthSetting,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";

/** Canonical framework-grounded AI chat. Journal inline/legacy chat journals use the same `my-ai-chat` backend. */
const LS_INCLUDE_GENERAL = "my_ai.include_general";
const LS_SIDEBAR = "my_ai.sidebar_open";

type ChatRow = { id: string; title: string | null; updated_at: string };

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

type MyAiInvokeOk = {
  chat_id: string;
  assistant_message_id: string;
  content: string;
  citations: Citation[];
};

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

function displayChatTitle(title: string | null | undefined): string {
  const t = title?.trim() || "My AI";
  if (t.length <= 44) return t;
  return `${t.slice(0, 41).trim()}…`;
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
    <div className="mt-4 border-t border-border/30 pt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => {
          const href = citationHref(c);
          const chip = (
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-normal",
                href
                  ? "border-border/60 bg-background text-foreground/80 hover:bg-muted/50"
                  : "border-border/50 bg-muted/30 text-muted-foreground",
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
    </div>
  );
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
  const { user, loading: authLoading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const navigate = useNavigate();
  const { chatId: routeChatId } = useParams<{ chatId: string }>();

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [responseDepth, setResponseDepth] = useState<ResponseDepthSetting>(() =>
    readResponseDepthSetting(MY_AI_RESPONSE_DEPTH_STORAGE_KEY),
  );
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const persistSidebar = (open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem(LS_SIDEBAR, open ? "1" : "0");
  };

  const loadChats = useCallback(async () => {
    if (!user) return;
    setLoadingChats(true);
    const { data, error } = await supabase
      .from("my_ai_chats")
      .select("id,title,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load chats", description: error.message, variant: "destructive" });
      setChats([]);
    } else {
      setChats((data as ChatRow[]) ?? []);
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
    if (!routeChatId) {
      setMessages([]);
      return;
    }
    void loadMessages(routeChatId);
  }, [routeChatId, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_INCLUDE_GENERAL, includeGeneral ? "1" : "0");
  }, [includeGeneral]);

  useEffect(() => {
    persistResponseDepthSetting(MY_AI_RESPONSE_DEPTH_STORAGE_KEY, responseDepth);
  }, [responseDepth]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const activeChat = chats.find((c) => c.id === routeChatId);
  const headerTitle = displayChatTitle(activeChat?.title);
  const headerTitleFull = activeChat?.title?.trim() || "My AI";
  const showWelcome = !loadingMessages && messages.length === 0 && !sending;
  const visibleMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");

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

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    const optimisticId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, role: "user", content: text, citations: [] },
      { id: `${optimisticId}-assistant`, role: "assistant", content: "", citations: [] },
    ]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: routeChatId ?? null,
          message: text,
          include_general_knowledge: includeGeneral,
          response_depth: responseDepth,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const payload = data as MyAiInvokeOk | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      if (!payload || typeof payload !== "object" || !("chat_id" in payload) || !payload.chat_id) {
        throw new Error("Unexpected response from My AI");
      }

      if (!routeChatId || routeChatId !== payload.chat_id) {
        navigate(`/my-ai/${payload.chat_id}`, { replace: !routeChatId });
      }
      await loadMessages(payload.chat_id);
      void loadChats();
    } catch (e) {
      toast({ title: "My AI failed", description: String(e), variant: "destructive" });
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("pending-")));
      setInput(text);
    } finally {
      setSending(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 flex-1 justify-start gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-muted/70"
          onClick={newChat}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          New chat
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 shrink-0 md:inline-flex"
          onClick={() => persistSidebar(false)}
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {loadingChats ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : chats.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-muted-foreground">No chats yet.</p>
        ) : (
          chats.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => openChat(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openChat(c.id);
                }
              }}
              className={cn(
                "group mx-1.5 flex cursor-pointer items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-xs transition-colors",
                routeChatId === c.id
                  ? "border-emerald-500 bg-emerald-500/8 font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <MessageCircle className="h-3 w-3 shrink-0 opacity-60" />
              <span className="min-w-0 flex-1 truncate">{c.title?.trim() || "Untitled"}</span>
              <button
                type="button"
                onClick={(e) => void deleteChat(c.id, e)}
                className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive focus-visible:opacity-100"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col overflow-hidden bg-background", showHubShell ? "h-full min-h-0" : "h-[100dvh]")}>
      <CognitiveStateDialog open={stateOpen} onOpenChange={setStateOpen} userId={user.id} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="hidden w-[240px] shrink-0 border-r border-border md:flex">{sidebarContent}</aside>
        )}

        <section className="relative flex min-w-0 flex-1 flex-col bg-background">
          <header className={cn(
            "flex shrink-0 items-center gap-2 border-b border-border bg-background px-2 pb-2 sm:px-3",
            showHubShell ? "pt-2" : "pt-[calc(var(--safe-area-inset-top)+0.5rem)]",
          )}>
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

            <MyAiMark size="md" />

            <h1 className="min-w-0 flex-1 truncate text-xs font-medium text-foreground sm:text-[13px]" title={headerTitleFull}>
              {headerTitle}
            </h1>

            {routeChatId && visibleMessages.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 sm:hidden"
                  disabled={savingJournal || sending}
                  aria-label="Save to journal"
                  onClick={() => void saveAsJournalEntry()}
                >
                  {savingJournal ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-8 shrink-0 gap-1.5 px-2 text-xs sm:inline-flex"
                  disabled={savingJournal || sending}
                  onClick={() => void saveAsJournalEntry()}
                >
                  {savingJournal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Chat settings">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
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
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pt-6 pb-40 sm:px-4">
            {routeChatId && loadingMessages && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
              </div>
            )}

            {showWelcome && (
              <div className="mx-auto flex max-w-md flex-col items-center justify-center px-2 py-8 text-center sm:py-12">
                <MyAiMark size="lg" className="mb-3" />
                <h2 className="text-base font-semibold tracking-tight text-foreground">How can I help?</h2>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Grounded in your beliefs, journals, and framework — with citations back to your sources.
                </p>
                <div className="mt-6 grid w-full gap-1.5 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={sending}
                      onClick={() => void send(prompt)}
                      className="rounded-lg border border-border bg-card px-2.5 py-2 text-left text-[11px] leading-snug text-muted-foreground transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-foreground disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loadingMessages && visibleMessages.length > 0 && (
              <div className="mx-auto w-full max-w-2xl space-y-6 pb-6">
                {visibleMessages.map((m) => (
                  <div key={m.id} className="w-full">
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[min(100%,36rem)] rounded-2xl bg-emerald-500/10 px-3.5 py-2.5 text-sm leading-relaxed text-foreground ring-1 ring-emerald-500/15 dark:bg-emerald-500/15">
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-none px-1 sm:px-2">
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
              </div>
            )}
          </div>

          <MyAiComposer
            input={input}
            onInputChange={setInput}
            onSend={() => void send()}
            sending={sending}
            userId={user.id}
            textareaRef={taRef}
            responseDepth={responseDepth}
            onResponseDepthChange={setResponseDepth}
            includeGeneral={includeGeneral}
            onIncludeGeneralChange={setIncludeGeneral}
            suggestedPrompts={SUGGESTED_PROMPTS}
            onSuggestedPrompt={(prompt) => void send(prompt)}
            canSaveJournal={Boolean(routeChatId && visibleMessages.length > 0)}
            onSaveJournal={() => void saveAsJournalEntry()}
            savingJournal={savingJournal}
            onNewChat={newChat}
            onOpenCognitiveState={() => setStateOpen(true)}
          />
        </section>
      </div>
    </div>
  );
}
