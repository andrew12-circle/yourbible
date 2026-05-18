import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Brain,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LS_INCLUDE_GENERAL = "my_ai.include_general";

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

function readIncludeGeneralDefault(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_INCLUDE_GENERAL);
  if (v === "0" || v === "false") return false;
  return true;
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

function MemoryIndicator({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  const types = new Set(citations.map((c) => c.source_type));
  const deep =
    types.has("identity") ||
    types.has("influence") ||
    (types.has("belief") && (types.has("journal") || types.has("artifact"))) ||
    citations.length >= 4;
  if (!deep) return null;
  return (
    <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-violet-600/80 dark:text-violet-300/80">
      <Brain className="h-3 w-3" />
      <span>Memory active · {citations.length} threads</span>
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

const QUICK_PROMPTS = [
  "Summarize what I believe about prayer.",
  "What scriptures keep coming up for me?",
  "Where do my beliefs contradict each other?",
  "Who are the biggest influences in my journey?",
];

export default function MyAiPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { chatId: routeChatId } = useParams<{ chatId: string }>();

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [sheetOpen, setSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const openChat = (id: string) => {
    setSheetOpen(false);
    navigate(`/my-ai/${id}`);
  };

  const newChat = () => {
    setSheetOpen(false);
    navigate("/my-ai");
    setMessages([]);
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const deleteChat = async (id: string) => {
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

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: routeChatId ?? null,
          message: text,
          include_general_knowledge: includeGeneral,
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
      setInput(text);
    } finally {
      setSending(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const rail = (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chats</span>
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={newChat}>
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadingChats ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-60" />
          </div>
        ) : chats.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">No chats yet. Start one from the main pane.</p>
        ) : (
          chats.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex cursor-pointer items-center gap-1 border-b border-border/60 px-2 py-2 text-sm hover:bg-muted/60",
                routeChatId === c.id && "bg-muted/80",
              )}
              onClick={() => openChat(c.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{c.title?.trim() || "Untitled"}</span>
              <button
                type="button"
                className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                aria-label="Delete chat"
                onClick={(ev) => {
                  ev.stopPropagation();
                  void deleteChat(c.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const showWelcome = !routeChatId && messages.length === 0 && !loadingMessages;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/home")} aria-label="Back home">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
          style={{
            background: "linear-gradient(145deg, #6D28D9 0%, #0D9488 52%, #14B8A6 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
          }}
        >
          <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">My AI</h1>
          <p className="truncate text-[11px] text-muted-foreground">Grounded in your framework</p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden shrink-0" aria-label="Open chats">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,320px)] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Chats</SheetTitle>
            </SheetHeader>
            <div className="h-[100dvh]">{rail}</div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[260px] shrink-0 md:flex">{rail}</aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
            {showWelcome && (
              <Card className="mx-auto mb-6 max-w-lg border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/15 to-teal-600/15">
                      <Brain className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Welcome to My AI</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        This assistant is built from your beliefs, journals, artifacts, and identity. Ask it anything — it will cite you back to yourself.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Try asking</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void send(q)}
                        disabled={sending}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-left text-[12px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {routeChatId && loadingMessages && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-60" />
              </div>
            )}

            {routeChatId && !loadingMessages && messages.length === 0 && (
              <div className="mx-auto max-w-md py-16 text-center text-sm text-muted-foreground">
                Say something to begin this chat.
              </div>
            )}

            <div className="mx-auto max-w-2xl space-y-4 pb-4">
              {messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => (
                <div key={m.id} className={cn(m.role === "user" && "flex justify-end")}>
                  {m.role === "user" ? (
                    <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-border/70 bg-card px-3.5 py-2.5 text-sm shadow-sm">
                      <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                        {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <TypingDots />}
                      </div>
                      <CitationChips citations={parseCitationsJson(m.citations)} />
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-border/70 bg-card px-3.5 py-2.5 text-sm shadow-sm">
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background/95 px-3 py-3 backdrop-blur-md sm:px-5">
            <div className="mx-auto flex max-w-2xl flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="my-ai-outside" className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Outside knowledge</span>
                  <span className="tabular-nums text-muted-foreground">{includeGeneral ? "On" : "Off"}</span>
                </label>
                <Switch
                  id="my-ai-outside"
                  checked={includeGeneral}
                  onCheckedChange={(v) => setIncludeGeneral(Boolean(v))}
                />
              </div>
              <div className="flex items-end gap-2">
                <Textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!sending) void send();
                    }
                  }}
                  rows={2}
                  disabled={sending}
                  placeholder={sending ? "Thinking…" : "Ask anything…"}
                  className="min-h-[52px] resize-none bg-background"
                />
                <Button type="button" size="icon" className="h-11 w-11 shrink-0" disabled={sending || !input.trim()} onClick={() => void send()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
