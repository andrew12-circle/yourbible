import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ClipboardCopy, Loader2, RefreshCw, Send, Settings2, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import type { FloatingClaimResearchHandoff } from "@/lib/journal/floatingJournalStore";
import ClaimResearchBar from "@/components/journal/ClaimResearchBar";
import type { ClaimVerdict } from "@/lib/framework/claimVerdict";
import {
  CLAIM_RESEARCH_PROMPT_CHIPS,
  formatResearchPackMarkdown,
  webSearchStatusLabel,
  type ResearchPackResp,
} from "@/lib/framework/claimResearchPack";

const LS_INCLUDE_GENERAL = "journal_chat.include_general";
const LS_MULTI_SOURCE = "journal_chat.claim_multi_source_validation";

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

function readMultiSourceDefault(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_MULTI_SOURCE);
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
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-tight",
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

const claimChatSessionPromises = new Map<string, Promise<{ entryId: string; chatId: string }>>();

function sessionKey(userId: string, claimId: string) {
  return `${userId}:${claimId}`;
}

async function ensureResearchChatSession(
  userId: string,
  artifactId: string,
  claimId: string,
  artifactTitle: string | null,
): Promise<{ entryId: string; chatId: string }> {
  const key = sessionKey(userId, claimId);
  const hit = claimChatSessionPromises.get(key);
  if (hit) return hit;

  const p = (async () => {
    const jid = await getDefaultJournalId(userId);
    const ctx = await getCurrentContext().catch(() => ({} as Record<string, unknown>));
    const now = new Date();
    const titleBase = artifactTitle?.trim() || "Artifact";
    const title = `Claim research — ${titleBase}`;
    const { data: ent, error: eErr } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        journal_id: jid,
        title,
        body: "",
        tags: [],
        entry_kind: "chat",
        analyze_for_mirror: false,
        entry_at_ts: now.toISOString(),
        entry_at: now.toISOString().slice(0, 10),
        location_name: (ctx.location_name as string | undefined) ?? null,
        lat: (ctx.lat as number | undefined) ?? null,
        lng: (ctx.lng as number | undefined) ?? null,
        weather: (ctx.weather as string | undefined) ?? null,
        weather_temp_c: (ctx.weather_temp_c as number | undefined) ?? null,
        weather_icon: (ctx.weather_icon as string | undefined) ?? null,
      })
      .select("id")
      .maybeSingle();
    if (eErr || !ent?.id) throw new Error(eErr?.message ?? "Could not create chat journal entry");

    const { data: chat, error: cErr } = await supabase
      .from("my_ai_chats")
      .insert({ user_id: userId, journal_entry_id: ent.id })
      .select("id")
      .maybeSingle();
    if (cErr || !chat?.id) throw new Error(cErr?.message ?? "Could not create chat thread");

    const { error: linkErr } = await supabase.from("journal_entry_links").insert({
      user_id: userId,
      entry_id: ent.id,
      target_kind: "artifact",
      target_ref: { id: artifactId },
    });
    if (linkErr) {
      toast({ title: "Chat started; artifact link failed", description: linkErr.message, variant: "destructive" });
    }

    return { entryId: ent.id as string, chatId: chat.id as string };
  })();

  claimChatSessionPromises.set(key, p);
  try {
    return await p;
  } catch (e) {
    claimChatSessionPromises.delete(key);
    throw e;
  }
}

type Props = {
  userId: string;
  research: FloatingClaimResearchHandoff;
};

export default function FloatingJournalResearchChatTab({ userId, research }: Props) {
  const [entryId, setEntryId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingShell, setLoadingShell] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [multiSourceValidation, setMultiSourceValidation] = useState(readMultiSourceDefault);
  const [claimVerdictBusy, setClaimVerdictBusy] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [packData, setPackData] = useState<ResearchPackResp | null>(null);
  const [packUseWeb, setPackUseWeb] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const ignoreResult = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_INCLUDE_GENERAL, includeGeneral ? "1" : "0");
  }, [includeGeneral]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_MULTI_SOURCE, multiSourceValidation ? "1" : "0");
  }, [multiSourceValidation]);

  const loadMessages = useCallback(
    async (cId: string) => {
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
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingShell(true);
      setEntryId(null);
      setChatId(null);
      setMessages([]);
      try {
        const { entryId: eId, chatId: cId } = await ensureResearchChatSession(
          userId,
          research.artifactId,
          research.claimId,
          research.artifactTitle,
        );
        if (cancelled) return;
        setEntryId(eId);
        setChatId(cId);

        await loadMessages(cId);
      } catch (e) {
        if (!cancelled) {
          toast({ title: "Could not open claim chat", description: String(e), variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingShell(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, research.artifactId, research.claimId, research.artifactTitle, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const stop = () => {
    ignoreResult.current = true;
    sendingRef.current = false;
    setSending(false);
  };

  const invokeValidationResearch = async (question: string) => {
    const { data, error } = await supabase.functions.invoke<ResearchPackResp>("claim-research-pack", {
      body: {
        artifact_claim_id: research.claimId,
        pack_type: "validation",
        user_question: question,
        claim_research: { use_web: packUseWeb },
      },
    });
    if (error) throw new Error(error.message);
    const payload = data as ResearchPackResp | { error?: string } | null;
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      throw new Error(payload.error);
    }
    if (!payload || typeof payload !== "object" || !("sections" in payload) || !payload.sections) {
      throw new Error("Unexpected response from validation research");
    }
    return payload as ResearchPackResp;
  };

  const sendValidationTurn = async (text: string) => {
    if (!chatId || !entryId) return;
    const { error: userErr } = await supabase.from("my_ai_messages").insert({
      user_id: userId,
      chat_id: chatId,
      role: "user",
      content: text,
      citations: [],
    });
    if (userErr) throw new Error(userErr.message);

    const pack = await invokeValidationResearch(text);
    const reply = formatResearchPackMarkdown(pack);
    const webNote = webSearchStatusLabel(pack.meta);
    const fullReply = `${reply}\n\n---\n\n_${webNote}_`;

    const { error: asstErr } = await supabase.from("my_ai_messages").insert({
      user_id: userId,
      chat_id: chatId,
      role: "assistant",
      content: fullReply,
      citations: [],
    });
    if (asstErr) throw new Error(asstErr.message);

    await supabase.from("my_ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId).eq("user_id", userId);
    await loadMessages(chatId);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sendingRef.current || !chatId || !entryId) return;
    ignoreResult.current = false;
    setInput("");
    sendingRef.current = true;
    setSending(true);
    try {
      if (multiSourceValidation) {
        await sendValidationTurn(text);
        return;
      }
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: chatId,
          message: text,
          mode: "journal",
          journal_entry_id: entryId,
          include_general_knowledge: includeGeneral,
        },
      });
      if (ignoreResult.current) return;
      if (error) throw new Error(error.message);
      const payload = data as MyAiInvokeOk | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      if (!payload || typeof payload !== "object" || !("chat_id" in payload) || !payload.chat_id) {
        throw new Error("Unexpected response from chat");
      }
      await loadMessages(payload.chat_id);
    } catch (e) {
      if (!ignoreResult.current) {
        toast({ title: "Message failed", description: String(e), variant: "destructive" });
        setInput(text);
      }
    } finally {
      sendingRef.current = false;
      if (!ignoreResult.current) setSending(false);
      ignoreResult.current = false;
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  const retryLast = async () => {
    if (!chatId || !entryId || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    ignoreResult.current = false;
    try {
      if (multiSourceValidation) {
        const { data: lastMsgs, error: ltErr } = await supabase
          .from("my_ai_messages")
          .select("id,role,content,created_at")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(8);
        if (ltErr) throw new Error(ltErr.message);
        const desc = (lastMsgs ?? []) as { id: string; role: string; content: string }[];
        const last = desc[0];
        if (!last || last.role !== "assistant") throw new Error("Nothing to retry");
        await supabase.from("my_ai_messages").delete().eq("id", last.id).eq("user_id", userId);
        let lastUser = "";
        for (let i = 1; i < desc.length; i++) {
          if (desc[i].role === "user") {
            lastUser = desc[i].content;
            break;
          }
        }
        if (!lastUser.trim()) throw new Error("No user message found to retry from");
        const pack = await invokeValidationResearch(lastUser.trim());
        const reply = formatResearchPackMarkdown(pack);
        const webNote = webSearchStatusLabel(pack.meta);
        await supabase.from("my_ai_messages").insert({
          user_id: userId,
          chat_id: chatId,
          role: "assistant",
          content: `${reply}\n\n---\n\n_${webNote}_`,
          citations: [],
        });
        await loadMessages(chatId);
        return;
      }
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: chatId,
          retry_last: true,
          mode: "journal",
          journal_entry_id: entryId,
          include_general_knowledge: includeGeneral,
        },
      });
      if (error) throw new Error(error.message);
      const payload = data as MyAiInvokeOk | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      await loadMessages(chatId);
    } catch (e) {
      toast({ title: "Retry failed", description: String(e), variant: "destructive" });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const applyClaimVerdict = async (verdict: ClaimVerdict) => {
    setClaimVerdictBusy(true);
    try {
      const deferred_at = verdict === "defer" ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("artifact_claims")
        .update({ verdict, deferred_at })
        .eq("id", research.claimId)
        .eq("user_id", userId);
      if (error) throw error;
      const label =
        verdict === "keep"
          ? "Marked keep"
          : verdict === "reject"
            ? "Marked reject"
            : verdict === "defer"
              ? "Saved for later"
              : "Marked updated";
      toast({ title: label });
    } catch (e) {
      toast({ title: "Could not update claim", description: String(e), variant: "destructive" });
    } finally {
      setClaimVerdictBusy(false);
    }
  };

  const runResearchPack = async () => {
    setPackOpen(true);
    setPackLoading(true);
    setPackData(null);
    try {
      const { data, error } = await supabase.functions.invoke<ResearchPackResp>("claim-research-pack", {
        body: {
          artifact_claim_id: research.claimId,
          pack_type: "validation",
          claim_research: { use_web: packUseWeb },
        },
      });
      if (error) throw new Error(error.message);
      const payload = data as ResearchPackResp | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      if (!payload || typeof payload !== "object" || !("sections" in payload) || !payload.sections) {
        throw new Error("Unexpected response from research pack");
      }
      setPackData(payload as ResearchPackResp);
      toast({ title: "Research pack ready" });
    } catch (e) {
      toast({ title: "Research pack failed", description: String(e), variant: "destructive" });
    } finally {
      setPackLoading(false);
    }
  };

  const packMarkdown = packData ? formatResearchPackMarkdown(packData) : "";

  const copyPack = async () => {
    if (!packMarkdown) return;
    try {
      await navigator.clipboard.writeText(packMarkdown);
      toast({ title: "Copied to clipboard" });
    } catch (e) {
      toast({ title: "Copy failed", description: String(e), variant: "destructive" });
    }
  };

  const appendPackToWrite = () => {
    if (!packMarkdown) return;
    const ref = floatingJournalInsertRef.current;
    if (ref?.artifactId === research.artifactId) {
      ref.append(packMarkdown);
      toast({ title: "Appended to Write tab" });
      return;
    }
    toast({
      title: "Could not append",
      description: "Open the floating journal on this artifact page so the Write tab is linked.",
      variant: "destructive",
    });
  };

  const showLoading = loadingShell || !chatId || !entryId;
  const visibleMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const settingsSummary = [
    multiSourceValidation ? "Multi-source on" : "Companion chat",
    packUseWeb ? "Web on" : "Web off",
  ].join(" · ");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ClaimResearchBar
        claimText={research.claimPreview}
        artifactId={research.artifactId}
        matchedBeliefId={research.matchedBeliefId}
        packLoading={packLoading}
        verdictBusy={claimVerdictBusy}
        onResearchPack={() => void runResearchPack()}
        onVerdict={(v) => void applyClaimVerdict(v)}
        className="px-0"
      />

      <div
        ref={scrollRef}
        className="min-h-[140px] min-w-0 flex-1 overflow-x-hidden overflow-y-auto border-b border-border/60 py-2"
      >
        {showLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-70" />
            <p className="text-[11px] text-muted-foreground">Opening research chat…</p>
          </div>
        )}
        {!showLoading && loadingMessages && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-70" />
          </div>
        )}
        {!showLoading && !loadingMessages && visibleMessages.length === 0 && !sending && (
          <div className="px-1 py-6 text-center">
            <p className="text-xs font-medium text-foreground">Research this claim</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Type a question below, tap a prompt chip, or use <span className="font-medium text-foreground">Validate claim</span>{" "}
              for a full multi-source pack.
            </p>
          </div>
        )}
        {!showLoading && !loadingMessages && (
          <div className="min-w-0 space-y-3 overflow-x-hidden pr-0.5">
            {visibleMessages.map((m) => (
              <div key={m.id} className={cn(m.role === "user" && "flex justify-end")}>
                {m.role === "user" ? (
                  <div className="max-w-[92%] break-words rounded-xl rounded-tr-sm bg-primary px-2.5 py-2 text-xs text-primary-foreground whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[94%] min-w-0 overflow-x-hidden rounded-xl rounded-tl-sm border border-border/70 bg-card px-2.5 py-2 text-xs shadow-sm">
                    <div className="prose prose-xs max-w-none break-words overflow-x-hidden dark:prose-invert text-foreground">
                      {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <TypingDots />}
                    </div>
                    <CitationChips citations={parseCitationsJson(m.citations)} />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="max-w-[94%] rounded-xl rounded-tl-sm border border-border/70 bg-card px-2.5 py-2 text-xs shadow-sm">
                <div className="prose prose-xs max-w-none text-muted-foreground">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 shrink-0 space-y-2 overflow-x-hidden pt-2">
        <div className="-mx-0.5 flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          {CLAIM_RESEARCH_PROMPT_CHIPS.map((chip) => (
            <Button
              key={chip.label}
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto shrink-0 whitespace-nowrap px-2 py-1 text-[10px] font-normal leading-snug"
              disabled={sending || showLoading}
              onClick={() => {
                setInput(chip.text);
                setTimeout(() => taRef.current?.focus(), 30);
              }}
            >
              {chip.label}
            </Button>
          ))}
        </div>
        <div className="flex min-w-0 items-end gap-1.5 overflow-x-hidden rounded-[26px] border border-border bg-background/95 px-2 py-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
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
            rows={1}
            spellCheck
            disabled={sending || showLoading}
            placeholder={sending ? "Thinking…" : "Ask about this claim…"}
            className="min-h-[40px] max-h-32 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[15px] leading-snug shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={sending || !messages.some((m) => m.role === "assistant")}
              onClick={() => void retryLast()}
              aria-label="Retry last response"
              title="Retry"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={!sending}
              onClick={stop}
              aria-label="Stop"
              title="Stop"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={sending || showLoading || !input.trim()}
              onClick={() => void send()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/25 px-2 py-1.5 text-left text-[10px] text-muted-foreground transition-colors hover:bg-muted/45"
            >
              <Settings2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{settingsSummary}</span>
              <ChevronDown
                className={cn("h-3 w-3 shrink-0 opacity-70 transition-transform", settingsOpen && "rotate-180")}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 overflow-x-hidden rounded-md border border-border/60 bg-muted/15 px-2 py-2">
            <div className="flex min-w-0 items-start justify-between gap-2 overflow-x-hidden">
              <div className="min-w-0 flex-1 space-y-1 overflow-x-hidden">
                <Label htmlFor="fj-multi-source" className="text-xs font-medium leading-snug text-foreground">
                  Multi-source validation (Bible + history + 3 voices)
                </Label>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Each message runs the validation research pack: Scripture alignment, historical context, and three named teachers or scholars.
                </p>
              </div>
              <Switch
                id="fj-multi-source"
                className="mt-0.5 shrink-0"
                checked={multiSourceValidation}
                onCheckedChange={(v) => setMultiSourceValidation(Boolean(v))}
              />
            </div>
            <div className="flex min-w-0 items-start justify-between gap-2 overflow-x-hidden">
              <div className="min-w-0 flex-1 space-y-1 overflow-x-hidden">
                <Label htmlFor="fj-outside" className="text-xs font-medium leading-snug text-foreground">
                  Journal companion mode (framework-grounded chat)
                </Label>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Only when multi-source validation is off. Uses your beliefs and journals—not the validation pack.
                </p>
              </div>
              <Switch
                id="fj-outside"
                className="mt-0.5 shrink-0"
                checked={includeGeneral}
                disabled={multiSourceValidation}
                onCheckedChange={(v) => setIncludeGeneral(Boolean(v))}
              />
            </div>
            <div className="flex min-w-0 items-start justify-between gap-2 overflow-x-hidden border-t border-border/50 pt-2">
              <div className="min-w-0 flex-1 space-y-1 overflow-x-hidden">
                <Label htmlFor="fj-pack-web-inline" className="text-xs font-medium leading-snug text-foreground">
                  Live web search (Brave / SerpAPI)
                </Label>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Applies to validation messages and Validate claim. Configure WEB_SEARCH_PROVIDER in Supabase Edge secrets.
                </p>
              </div>
              <Switch
                id="fj-pack-web-inline"
                className="mt-0.5 shrink-0"
                checked={packUseWeb}
                onCheckedChange={(v) => setPackUseWeb(Boolean(v))}
              />
            </div>
            {chatId ? (
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link to={`/my-ai/${chatId}`}>Open in My AI</Link>
              </Button>
            ) : entryId ? (
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link to={`/journal/chat/${entryId}`}>Open chat session</Link>
              </Button>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Sheet open={packOpen} onOpenChange={setPackOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
            <SheetTitle className="text-sm">Multi-source validation pack</SheetTitle>
            <p className="text-[11px] font-normal leading-relaxed text-muted-foreground">
              Bible alignment (fetched passages when refs exist), historical context, and three independent voices. Epistemic labels show whether each part used scripture text, web snippets, or training data only—not verified citations.
            </p>
            <p className="text-[10px] text-muted-foreground">
              Web search uses the settings toggle below the composer. {packData?.meta ? webSearchStatusLabel(packData.meta) : "Run the pack to see web status."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={!packMarkdown} onClick={() => void copyPack()}>
                <ClipboardCopy className="mr-1 h-3 w-3" /> Copy
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={!packMarkdown} onClick={appendPackToWrite}>
                Append to Write tab
              </Button>
            </div>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 py-3">
            {packLoading && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!packLoading && packMarkdown && (
              <div className="prose prose-xs max-w-none pb-8 dark:prose-invert">
                <ReactMarkdown>{packMarkdown}</ReactMarkdown>
              </div>
            )}
            {!packLoading && !packMarkdown && (
              <p className="py-8 text-center text-xs text-muted-foreground">Run Research pack from the claim bar if this panel is empty.</p>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
