import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { streamVerseAI } from "@/lib/bible/api";
import { findBookByAbbr } from "@/data/books";
import { fetchWlcVerseText } from "@/lib/bible/wlcVerse";
import { fetchSblgntVerse, type SblgntWord } from "@/lib/bible/sblgntVerse";
import { InterlinearWords } from "@/components/bible/InterlinearWords";
import { lookupStrongs, type StrongsEntry } from "@/lib/bible/strongsDictionary";
import { Send, Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reference: string;
  verseText: string;
  bookAbbr?: string;
  chapter?: number;
  verseNumber?: number;
}

type Msg = { role: "user" | "assistant"; content: string };

export function VerseSheet({
  open,
  onOpenChange,
  reference,
  verseText,
  bookAbbr,
  chapter,
  verseNumber,
}: Props) {
  const [tab, setTab] = useState<"summary" | "context" | "apply" | "deep" | "original" | "chat">("summary");
  const [hebrewText, setHebrewText] = useState<string | null>(null);
  const [hebrewLoading, setHebrewLoading] = useState(false);
  const [greekText, setGreekText] = useState<string | null>(null);
  const [greekWords, setGreekWords] = useState<SblgntWord[]>([]);
  const [greekLoading, setGreekLoading] = useState(false);
  const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null);
  const [strongsLoading, setStrongsLoading] = useState(false);
  const book = bookAbbr ? findBookByAbbr(bookAbbr) : undefined;
  const showOriginal = (book?.testament === "OT" || book?.testament === "NT") && chapter != null && verseNumber != null;
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
      setHebrewText(null);
      setGreekText(null);
      setGreekWords([]);
      setStrongsEntry(null);
    }
  }, [open, reference]);

  useEffect(() => {
    if (!open || tab !== "original" || !showOriginal || !bookAbbr || chapter == null || verseNumber == null) return;
    const controller = new AbortController();
    const isOt = book?.testament === "OT";

    if (isOt) {
      setHebrewLoading(true);
      fetchWlcVerseText(bookAbbr, chapter, verseNumber, controller.signal)
        .then(setHebrewText)
        .catch(() => setHebrewText(null))
        .finally(() => {
          if (!controller.signal.aborted) setHebrewLoading(false);
        });
    } else {
      setGreekLoading(true);
      fetchSblgntVerse(bookAbbr, chapter, verseNumber, controller.signal)
        .then((row) => {
          setGreekText(row?.text ?? null);
          setGreekWords(row?.words ?? []);
        })
        .catch(() => {
          setGreekText(null);
          setGreekWords([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setGreekLoading(false);
        });
    }

    return () => controller.abort();
  }, [open, tab, showOriginal, bookAbbr, chapter, verseNumber, book?.testament]);

  const lookupStrongsFromToken = async (id: string) => {
    setStrongsLoading(true);
    try {
      const entry = await lookupStrongs(id, book?.testament);
      setStrongsEntry(entry);
    } catch {
      setStrongsEntry(null);
    } finally {
      setStrongsLoading(false);
    }
  };

  // Auto-load active mode
  useEffect(() => {
    if (!open || tab === "chat" || tab === "original") return;
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
          <TabsList className={`grid ${showOriginal ? "grid-cols-6" : "grid-cols-5"} mx-6 mt-4 bg-paper-warm`}>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="apply">Apply</TabsTrigger>
            <TabsTrigger value="deep">Deep</TabsTrigger>
            {showOriginal ? (
              <TabsTrigger value="original">{book?.testament === "OT" ? "Hebrew" : "Greek"}</TabsTrigger>
            ) : null}
            <TabsTrigger value="chat">Ask</TabsTrigger>
          </TabsList>

          {(["summary", "context", "apply", "deep"] as const).map(mode => (
            <TabsContent key={mode} value={mode} className="flex-1 overflow-y-auto px-6 py-5 mt-0 data-[state=inactive]:hidden">
              <div className="font-scripture text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                {content[mode] || (loading[mode] ? <span className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Reading…</span> : "")}
              </div>
            </TabsContent>
          ))}

          {showOriginal ? (
            <TabsContent value="original" className="flex-1 overflow-y-auto px-6 py-5 mt-0 data-[state=inactive]:hidden">
              {book?.testament === "OT" ? (
                hebrewLoading ? (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading WLC…
                  </span>
                ) : hebrewText ? (
                  <p className="font-hebrew text-2xl leading-relaxed text-right" dir="rtl">
                    {hebrewText}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Hebrew text unavailable for this verse.</p>
                )
              ) : greekLoading ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading SBLGNT…
                </span>
              ) : greekText ? (
                <>
                  <p className="font-greek text-2xl leading-relaxed mb-4">{greekText}</p>
                  {greekWords.length > 0 ? (
                    <InterlinearWords
                      tokens={greekWords}
                      onStrongsClick={(id) => void lookupStrongsFromToken(id)}
                    />
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">Greek text unavailable for this verse.</p>
              )}
              {strongsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mt-4" />
              ) : strongsEntry ? (
                <div className="mt-4 rounded-lg border p-3 bg-muted/30 space-y-1 text-sm">
                  <p className="font-semibold">
                    {strongsEntry.id}
                    {strongsEntry.lemma ? (
                      <span className="font-greek ml-2">{strongsEntry.lemma}</span>
                    ) : null}
                  </p>
                  {strongsEntry.transliteration ? (
                    <p className="text-muted-foreground italic">{strongsEntry.transliteration}</p>
                  ) : null}
                  <p>{strongsEntry.definition}</p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground mt-3">
                {book?.testament === "OT"
                  ? "Westminster Leningrad Codex (bundled). Word-level interlinear coming soon."
                  : "MorphGNT SBLGNT (CC-BY-SA). Tap a word for Strong's lookup."}
              </p>
            </TabsContent>
          ) : null}

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
