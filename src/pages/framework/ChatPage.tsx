import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Plus, Send, Trash2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Thread { id: string; title: string; mode: string; updated_at: string }
interface Msg { id?: string; role: "user" | "assistant"; content: string }

const MODES: { id: string; label: string; hint: string }[] = [
  { id: "socratic", label: "Socratic", hint: "Sharp questions, no answers." },
  { id: "devil", label: "Devil's advocate", hint: "Steel-man the opposite." },
  { id: "pastor", label: "Pastoral", hint: "Listen, reflect, invite." },
];

export default function ChatPage() {
  const { user, loading } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    if (!user) return;
    const { data } = await supabase.from("chat_threads")
      .select("id,title,mode,updated_at").eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setThreads((data as Thread[]) ?? []);
    if (!activeId && data && data.length) setActiveId(data[0].id);
  };

  useEffect(() => { loadThreads(); }, [user]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("chat_messages")
        .select("id,role,content").eq("thread_id", activeId).order("created_at", { ascending: true });
      setMessages((data as Msg[]) ?? []);
      setTimeout(() => taRef.current?.focus(), 50);
    })();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const newThread = async (mode: string = "socratic") => {
    const { data, error } = await supabase.from("chat_threads")
      .insert({ user_id: user.id, title: "New conversation", mode })
      .select("id,title,mode,updated_at").maybeSingle();
    if (error || !data) return toast({ title: "Failed", description: error?.message, variant: "destructive" });
    setThreads((t) => [data as Thread, ...t]);
    setActiveId(data.id);
  };

  const deleteThread = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    await supabase.from("chat_threads").delete().eq("id", id);
    setThreads((arr) => arr.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(threads.find((t) => t.id !== id)?.id ?? null);
  };

  const setMode = async (mode: string) => {
    if (!activeId) return;
    await supabase.from("chat_threads").update({ mode }).eq("id", activeId);
    setThreads((arr) => arr.map((t) => t.id === activeId ? { ...t, mode } : t));
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    let threadId = activeId;
    if (!threadId) {
      const { data } = await supabase.from("chat_threads")
        .insert({ user_id: user.id, title: "New conversation", mode: "socratic" })
        .select("id,title,mode,updated_at").maybeSingle();
      if (!data) return;
      threadId = data.id;
      setThreads((t) => [data as Thread, ...t]);
      setActiveId(threadId);
    }

    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

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
      // Refresh thread list (title may have updated)
      loadThreads();
    } catch (e) {
      toast({ title: "Chat failed", description: String(e), variant: "destructive" });
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const active = threads.find((t) => t.id === activeId);

  return (
    <FrameworkLayout title="Framework Chat" back="/framework">
      <div className="grid md:grid-cols-[220px_1fr] gap-4 h-[calc(100vh-200px)]">
        {/* Thread list */}
        <aside className="hidden md:flex flex-col rounded-lg border border-border bg-card overflow-hidden">
          <Button onClick={() => newThread()} variant="ghost" size="sm" className="m-2 justify-start">
            <Plus className="w-4 h-4 mr-1" /> New conversation
          </Button>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 && (
              <div className="p-3 text-xs text-muted-foreground">No conversations yet.</div>
            )}
            {threads.map((t) => (
              <div key={t.id}
                className={cn("group flex items-center gap-1 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted",
                  activeId === t.id && "bg-muted")}
                onClick={() => setActiveId(t.id)}>
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{t.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-0">
          <div className="border-b border-border px-3 py-2 flex items-center gap-2 flex-wrap">
            <Button onClick={() => newThread()} size="sm" variant="ghost" className="md:hidden">
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <div className="text-xs text-muted-foreground truncate flex-1">
              {active?.title ?? "New conversation"}
            </div>
            <div className="inline-flex rounded-md border border-border overflow-hidden text-[11px]">
              {MODES.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} title={m.hint}
                  className={cn("px-2 py-1",
                    (active?.mode ?? "socratic") === m.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-12 max-w-md mx-auto">
                Ask anything. The chat knows your beliefs, your open tensions, and your sources — and won't pretend to be God.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn(m.role === "user" && "flex justify-end")}>
                {m.role === "user" ? (
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[85%] text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                    {m.content ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Thinking…</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-2 flex items-end gap-2">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!streaming) send();
                }
              }}
              rows={2}
              placeholder={streaming ? "Streaming…" : "Press Enter to send, Shift+Enter for newline"}
              disabled={streaming}
              spellCheck
              className="resize-none"
            />
            <Button onClick={send} disabled={streaming || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </div>
    </FrameworkLayout>
  );
}