import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { streamVerseAI } from "@/lib/bible/api";
import { Send, Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reference: string;
  verseText: string;
}

type Msg = { role: "user" | "assistant"; content: string };

export function VerseSheet({ open, onOpenChange, reference, verseText }: Props) {
  const [tab, setTab] = useState<"summary" | "context" | "apply" | "deep" | "chat">("summary");
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [chat, setChat] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Reset on new verse
  useEffect(() => {
    if (open) {
      setContent({});
      setChat([]);
      setTab("summary");
    }
  }, [open, reference]);

  // Auto-load active mode
  useEffect(() => {
    if (!open || tab === "chat") return;
    if (content[tab] || loading[tab]) return;
    runMode(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  const runMode = async (mode: "summary" | "context" | "apply" | "deep") => {
    setLoading(s => ({ ...s, [mode]: true }));
    setContent(s => ({ ...s, [mode]: "" }));
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await streamVerseAI({
        mode, reference, verseText,
        signal: abortRef.current.signal,
        onDelta: (chunk) => setContent(s => ({ ...s, [mode]: (s[mode] ?? "") + chunk })),
        onError: (msg) => setContent(s => ({ ...s, [mode]: `⚠ ${msg}` })),
      });
    } finally {
      setLoading(s => ({ ...s, [mode]: false }));
    }
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setChat(c => [...c, userMsg]);
    setInput("");
    setSending(true);
    let assistantSoFar = "";
    setChat(c => [...c, { role: "assistant", content: "" }]);
    try {
      await streamVerseAI({
        mode: "chat",
        reference, verseText,
        question: userMsg.content,
        history: chat,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setChat(c => c.map((m, i) => i === c.length - 1 ? { ...m, content: assistantSoFar } : m));
        },
        onError: (msg) => {
          setChat(c => c.map((m, i) => i === c.length - 1 ? { ...m, content: `⚠ ${msg}` } : m));
        },
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] paper-texture border-t-2 border-gold/40 p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-paper-edge">
          <div className="text-[10px] uppercase tracking-widest text-gold-deep flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Tap to understand
          </div>
          <SheetTitle className="font-display text-2xl text-leather text-left">{reference}</SheetTitle>
          <p className="font-scripture text-base text-foreground/80 italic text-balance">"{verseText}"</p>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 mx-6 mt-4 bg-paper-warm">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="apply">Apply</TabsTrigger>
            <TabsTrigger value="deep">Deep</TabsTrigger>
            <TabsTrigger value="chat">Ask</TabsTrigger>
          </TabsList>

          {(["summary", "context", "apply", "deep"] as const).map(mode => (
            <TabsContent key={mode} value={mode} className="flex-1 overflow-y-auto px-6 py-5 mt-0 data-[state=inactive]:hidden">
              <div className="font-scripture text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                {content[mode] || (loading[mode] ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Reading…</span> : "")}
              </div>
            </TabsContent>
          ))}

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {chat.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">Ask anything about this verse — context, meaning, cross-references…</div>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`max-w-[88%] ${m.role === "user" ? "ml-auto" : ""}`}>
                  <div className={`text-[10px] uppercase tracking-widest mb-1 ${m.role === "user" ? "text-leather text-right" : "text-gold-deep"}`}>
                    {m.role === "user" ? "You" : "Companion"}
                  </div>
                  <div className={`p-3 rounded-lg text-[15px] leading-relaxed font-scripture whitespace-pre-wrap ${m.role === "user" ? "bg-leather text-paper" : "bg-paper-warm border border-paper-edge text-foreground"}`}>
                    {m.content || (sending && i === chat.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : "")}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-paper-edge bg-paper/60 flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask about this verse…" disabled={sending} />
              <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="leather-texture text-gold-bright"><Send className="w-4 h-4" /></Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
