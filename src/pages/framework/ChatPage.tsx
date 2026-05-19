/**
 * Legacy Framework Chat (Socratic / devil's advocate / pastoral) on `chat_threads`.
 * Canonical grounded chat is `/my-ai` (`my-ai-chat`). Route `/framework/chat` redirects to My AI;
 * this page remains at `/framework/chat/legacy` until modes are merged.
 */
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ChevronDown,
  Loader2,
  Menu,
  MessageCircle,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LS_SIDEBAR = "framework_chat.sidebar_open";
const FRAMEWORK_MODES = ["socratic", "devil", "pastor"] as const;

interface Thread {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
}

interface Msg {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const MODES: { id: (typeof FRAMEWORK_MODES)[number]; label: string; hint: string }[] = [
  { id: "socratic", label: "Socratic", hint: "Sharp questions, no answers." },
  { id: "devil", label: "Devil's advocate", hint: "Steel-man the opposite." },
  { id: "pastor", label: "Pastoral", hint: "Listen, reflect, invite." },
];

const SUGGESTED_PROMPTS = [
  "Where does my framework feel weakest right now?",
  "Steel-man the strongest objection to my core belief.",
  "What open tension should I sit with this week?",
  "Ask me three questions I am avoiding.",
];

function readSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_SIDEBAR);
  if (v === "0" || v === "false") return false;
  return true;
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

export default function ChatPage() {
  const { user, loading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<(typeof FRAMEWORK_MODES)[number]>("socratic");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didPickInitialThread = useRef(false);

  const persistSidebar = (open: boolean) => {
    setSidebarOpen(open);
    localStorage.setItem(LS_SIDEBAR, open ? "1" : "0");
  };

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoadingThreads(true);
    const { data, error } = await supabase
      .from("chat_threads")
      .select("id,title,mode,updated_at")
      .eq("user_id", user.id)
      .in("mode", [...FRAMEWORK_MODES])
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Could not load conversations", description: error.message, variant: "destructive" });
    }
    const list = (data as Thread[]) ?? [];
    setThreads(list);
    if (!didPickInitialThread.current && list.length > 0) {
      didPickInitialThread.current = true;
      setActiveId(list[0].id);
    }
    setLoadingThreads(false);
  }, [user]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,role,content")
        .eq("thread_id", activeId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load messages", description: error.message, variant: "destructive" });
        setMessages([]);
      } else {
        setMessages((data as Msg[]) ?? []);
      }
      setLoadingMessages(false);
      setTimeout(() => taRef.current?.focus(), 50);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const resizeComposer = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [input, resizeComposer]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const active = threads.find((t) => t.id === activeId);
  const currentMode = (active?.mode ?? draftMode) as (typeof FRAMEWORK_MODES)[number];
  const modeMeta = MODES.find((m) => m.id === currentMode) ?? MODES[0];
  const showWelcome = !loadingMessages && messages.length === 0 && !streaming;
  const headerTitle = active?.title && active.title !== "New conversation" ? active.title : "Framework Chat";

  const startNewChat = (mode: (typeof FRAMEWORK_MODES)[number] = draftMode) => {
    setActiveId(null);
    setMessages([]);
    setDraftMode(mode);
    setInput("");
    setMobileSheetOpen(false);
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const selectThread = (id: string) => {
    setActiveId(id);
    const t = threads.find((th) => th.id === id);
    if (t && FRAMEWORK_MODES.includes(t.mode as (typeof FRAMEWORK_MODES)[number])) {
      setDraftMode(t.mode as (typeof FRAMEWORK_MODES)[number]);
    }
    setMobileSheetOpen(false);
  };

  const deleteThread = async (id: string, e?: MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    const { error } = await supabase.from("chat_threads").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setThreads((arr) => arr.filter((t) => t.id !== id));
    if (activeId === id) {
      const next = threads.find((t) => t.id !== id);
      setActiveId(next?.id ?? null);
      if (!next) setMessages([]);
    }
  };

  const setMode = async (mode: (typeof FRAMEWORK_MODES)[number]) => {
    setDraftMode(mode);
    if (!activeId) return;
    const { error } = await supabase.from("chat_threads").update({ mode }).eq("id", activeId);
    if (error) {
      toast({ title: "Could not change mode", description: error.message, variant: "destructive" });
      return;
    }
    setThreads((arr) => arr.map((t) => (t.id === activeId ? { ...t, mode } : t)));
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;

    let threadId = activeId;
    const mode = currentMode;

    if (!threadId) {
      const { data, error } = await supabase
        .from("chat_threads")
        .insert({ user_id: user.id, title: "New conversation", mode })
        .select("id,title,mode,updated_at")
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Could not start conversation", description: error?.message, variant: "destructive" });
        return;
      }
      threadId = data.id;
      setThreads((t) => [data as Thread, ...t]);
      setActiveId(threadId);
    }

    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    resizeComposer();

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/framework-chat`;
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ thread_id: threadId, content: text }),
      });
      if (!r.ok || !r.body) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      await loadThreads();
    } catch (e) {
      toast({ title: "Chat failed", description: String(e), variant: "destructive" });
      setMessages((m) => m.slice(0, -2));
    } finally {
      setStreaming(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-1 border-b border-border/80 px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 flex-1 justify-start gap-2 rounded-lg px-2.5 text-sm font-medium hover:bg-muted/80"
            onClick={() => startNewChat()}
          >
            <Plus className="h-4 w-4 shrink-0" />
            New chat
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 shrink-0 md:inline-flex"
            onClick={() => persistSidebar(false)}
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {loadingThreads ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
            </div>
          ) : threads.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No conversations yet.</p>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectThread(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectThread(t.id);
                    }
                  }}
                  className={cn(
                    "group mx-1.5 flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    activeId === t.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <button
                    type="button"
                    onClick={(e) => void deleteThread(t.id, e)}
                    className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive focus-visible:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
            ))
          )}
        </div>
      </div>
  );

  return (
    <FrameworkLayout
      title="Framework Chat"
      back="/framework"
      contentClassName="max-w-none px-0 pb-0 pt-2 sm:pt-3"
      headerContentClassName="max-w-none"
    >
      <div className="flex h-[calc(100dvh-11.5rem)] min-h-[420px] overflow-hidden rounded-xl border border-border/70 bg-card/30 shadow-sm sm:mx-1">
        {sidebarOpen && (
          <aside className="hidden w-[260px] shrink-0 md:flex">{sidebarContent}</aside>
        )}

        <section className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-2 border-b border-border/80 px-2 py-2 sm:px-3">
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 md:hidden"
                  aria-label="Open conversations"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100%,300px)] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Conversations</SheetTitle>
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
              onClick={() => startNewChat()}
              aria-label="New chat"
            >
              <Plus className="h-5 w-5" />
            </Button>

            <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:text-[15px]">
              {headerTitle}
            </h2>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 rounded-lg px-2.5 text-xs font-medium">
                  {modeMeta.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {MODES.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => void setMode(m.id)}
                    className={cn("flex flex-col items-start gap-0.5 py-2", currentMode === m.id && "bg-muted")}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className="text-[11px] text-muted-foreground">{m.hint}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-36 sm:px-5">
            {loadingMessages && activeId && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
              </div>
            )}

            {showWelcome && (
              <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-2 py-10 text-center sm:py-16">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">How can I help?</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  I know your beliefs, open tensions, and sources — in{" "}
                  <span className="font-medium text-foreground">{modeMeta.label}</span> mode. I won&apos;t pretend to
                  be God.
                </p>
                <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={streaming}
                      onClick={() => void send(prompt)}
                      className="rounded-xl border border-border/80 bg-background/80 px-3 py-2.5 text-left text-xs leading-snug text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loadingMessages && messages.length > 0 && (
              <div className="mx-auto max-w-2xl space-y-4 pb-4">
                {messages.map((m, i) => (
                  <div key={m.id ?? i}>
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground shadow-sm whitespace-pre-wrap">
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-full px-0.5 py-0.5">
                        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground prose-p:my-2 prose-p:text-[13px] prose-p:leading-relaxed prose-headings:font-semibold">
                          {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <TypingDots />}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-card via-card/95 to-transparent px-3 pb-3 pt-8 sm:px-5"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
          >
            <div className="pointer-events-auto mx-auto max-w-2xl">
              <div className="flex items-end gap-1.5 rounded-[26px] border border-border bg-background/95 px-2 py-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
                <Textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!streaming) void send();
                    }
                  }}
                  rows={1}
                  disabled={streaming}
                  spellCheck
                  placeholder={streaming ? "Thinking…" : "Message Framework Chat"}
                  className="min-h-[40px] max-h-40 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[15px] leading-snug shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={streaming || !input.trim()}
                  onClick={() => void send()}
                  className="mb-0.5 h-9 w-9 shrink-0 rounded-full"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground/80">
                Enter to send · Shift+Enter for newline
              </p>
            </div>
          </div>
        </section>
      </div>
    </FrameworkLayout>
  );
}
