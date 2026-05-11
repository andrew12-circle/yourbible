import { useEffect, useRef, useState } from "react";
import { useCompanion, scopeRef } from "@/lib/reader/companionStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Library, Globe, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reader-dialogue`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Msg { role: "user" | "assistant"; content: string; }
interface ArtifactHit {
  id: string; artifact_id: string; artifact_title: string;
  claim: string; verdict: string | null;
}

export function CompanionDialogueTab() {
  const { user } = useAuth();
  const { scope, threadId, entryId, setThreadId } = useCompanion();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hits, setHits] = useState<ArtifactHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load journal draft to send as context
  useEffect(() => {
    if (!user || !entryId) { setDraftBody(""); return; }
    supabase.from("journal_entries").select("body").eq("id", entryId).maybeSingle()
      .then(({ data }) => setDraftBody(data?.body ?? ""));
  }, [entryId, user]);

  // Find or create thread for this scope
  useEffect(() => {
    if (!user || !scope || threadId) return;
    (async () => {
      const target = { book: scope.book, chapter: scope.chapter, verses: scope.verses };
      const { data: existing } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("user_id", user.id)
        .eq("mode", "reader_dialogue")
        .contains("target_ref", target as never)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (existing && existing[0]) {
        setThreadId(existing[0].id);
        const { data: m } = await supabase.from("chat_messages")
          .select("role,content").eq("thread_id", existing[0].id)
          .order("created_at", { ascending: true });
        setMsgs((m ?? []) as Msg[]);
        return;
      }
      const { data: created } = await supabase.from("chat_threads").insert({
        user_id: user.id,
        mode: "reader_dialogue",
        title: `Reading ${scopeRef(scope)}`,
        target_ref: target as never,
      }).select("id").maybeSingle();
      if (created?.id) setThreadId(created.id);
    })();
  }, [user, scope, threadId, setThreadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, streaming]);

  const send = async () => {
    if (!user || !scope || !threadId || !input.trim() || streaming) return;
    const content = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON,
          Authorization: `Bearer ${session?.access_token ?? ANON}`,
        },
        body: JSON.stringify({
          action: "chat",
          thread_id: threadId,
          content,
          journal_draft: draftBody,
          scope,
        }),
      });
      if (!r.ok || !r.body) {
        const t = await r.text();
        toast({ variant: "destructive", title: "Dialogue failed", description: t.slice(0, 200) });
        setMsgs(m => m.slice(0, -1));
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMsgs(m => {
          const next = m.slice();
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } finally { setStreaming(false); }
  };

  const fetchPerspectives = async () => {
    if (!user || !scope) return;
    setSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON,
          Authorization: `Bearer ${session?.access_token ?? ANON}`,
        },
        body: JSON.stringify({
          action: "search_artifacts",
          scope,
          query: scopeRef(scope) + " " + draftBody.slice(0, 400),
        }),
      });
      const j = await r.json();
      setHits(j.results ?? []);
    } finally { setSearching(false); }
  };

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-sm">
        {msgs.length === 0 && (
          <div className="text-center text-muted-foreground text-xs pt-4">
            <BookOpen className="w-5 h-5 mx-auto mb-2 opacity-60" />
            Ask anything about this passage. The companion will press back with questions to sharpen your thinking.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-6" : "mr-2"}>
            {m.role === "user" ? (
              <div className="bg-leather text-paper rounded-2xl rounded-br-sm px-3 py-2 text-sm">
                {m.content}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none ink-text [&>p]:my-1.5">
                <ReactMarkdown>{m.content || (streaming ? "…" : "")}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {hits && hits.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-paper-edge/60">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Library className="w-3 h-3" /> From your library
            </div>
            {hits.map(h => (
              <div key={h.id} className="bg-paper-warm/60 border border-paper-edge rounded-lg p-2 text-xs">
                <div className="font-medium ink-text mb-0.5">{h.artifact_title}</div>
                <div className="text-muted-foreground line-clamp-3">{h.claim}</div>
              </div>
            ))}
          </div>
        )}
        {hits && hits.length === 0 && (
          <div className="text-xs text-muted-foreground italic">No matching claims in your library yet.</div>
        )}
      </div>
      <div className="border-t border-paper-edge p-2 space-y-2">
        <div className="flex gap-1.5">
          <Button
            type="button" size="sm" variant="outline"
            onClick={fetchPerspectives}
            disabled={searching || !scope}
            className="text-[11px] h-7 gap-1.5"
          >
            {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Library className="w-3 h-3" />}
            From my library
          </Button>
          <Button
            type="button" size="sm" variant="outline" disabled
            title="Coming soon"
            className="text-[11px] h-7 gap-1.5 opacity-60"
          >
            <Globe className="w-3 h-3" /> Web (soon)
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
            }}
            placeholder="Ask. Doubt. Push back…  (⌘/Ctrl + Enter to send)"
            rows={2}
            className="resize-none bg-paper border-paper-edge text-sm flex-1"
          />
          <Button
            type="button" size="icon"
            onClick={send}
            disabled={streaming || !input.trim() || !threadId}
            className="self-end bg-leather text-paper hover:bg-leather/90"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}