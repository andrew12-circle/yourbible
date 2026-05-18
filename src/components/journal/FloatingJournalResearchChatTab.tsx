import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ClipboardCopy, Loader2, RefreshCw, Send, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import type { FloatingClaimResearchHandoff } from "@/lib/journal/floatingJournalStore";

const LS_INCLUDE_GENERAL = "journal_chat.include_general";

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

type ResearchPackSection = { body: string; epistemic: string };

type ResearchPackResp = {
  sections: Record<string, ResearchPackSection>;
  scripture?: { ref: string; reference?: string; text?: string; error?: string }[];
  meta?: {
    bible_id?: string;
    used_web?: boolean;
    web_provider?: string | null;
    lenses?: string[];
    ref_parse_errors?: { ref: string; error: string }[];
  };
  error?: string;
};

const RESEARCH_LENS_ORDER = [
  "scripture_context",
  "historical_theology",
  "opposing_views",
  "denominational_notes",
  "logical_audit",
  "scientific_relevance",
  "synthesis",
] as const;

const RESEARCH_LENS_LABELS: Record<string, string> = {
  scripture_context: "Scripture context",
  historical_theology: "Historical theology",
  opposing_views: "Opposing views",
  denominational_notes: "Denominational notes",
  logical_audit: "Logical audit",
  scientific_relevance: "Scientific relevance",
  synthesis: "Synthesis",
};

function formatResearchPackMarkdown(data: ResearchPackResp): string {
  const lines: string[] = ["# Claim research pack", ""];
  const meta = data.meta;
  if (meta) {
    lines.push(
      `_Bible translation id: ${meta.bible_id ?? "—"} · Web search: ${meta.used_web ? `on (${meta.web_provider ?? "?"})` : "off"}_`,
      "",
    );
  }
  const scr = data.scripture;
  if (scr?.length) {
    lines.push("## Passages fetched", "");
    for (const row of scr) {
      if (row.error) lines.push(`- **${row.ref}**: _${row.error}_`);
      else lines.push(`- **${row.ref}**${row.reference ? ` (${row.reference})` : ""}`, "", "```text", row.text ?? "", "```", "");
    }
  }
  const errs = meta?.ref_parse_errors;
  if (errs?.length) {
    lines.push("## Reference notes", "");
    for (const e of errs) lines.push(`- **${e.ref}**: ${e.error}`);
    lines.push("");
  }
  const order = (meta?.lenses?.length ? meta.lenses : [...RESEARCH_LENS_ORDER]) as string[];
  for (const id of order) {
    const s = data.sections[id];
    if (!s) continue;
    const title = RESEARCH_LENS_LABELS[id] ?? id;
    lines.push(`## ${title}`, "", `*Epistemic: ${s.epistemic}*`, "", s.body.trim(), "", "---", "");
  }
  return lines.join("\n").trimEnd();
}

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
const bootstrappedClaimChatKeys = new Set<string>();

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
  const [bootstrapping, setBootstrapping] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [claimVerdictBusy, setClaimVerdictBusy] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [packData, setPackData] = useState<ResearchPackResp | null>(null);
  const [packUseWeb, setPackUseWeb] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const ignoreResult = useRef(false);
  const includeGeneralRef = useRef(includeGeneral);

  includeGeneralRef.current = includeGeneral;

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_INCLUDE_GENERAL, includeGeneral ? "1" : "0");
  }, [includeGeneral]);

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

        const bootKey = sessionKey(userId, research.claimId);
        const { data: firstMsg } = await supabase.from("my_ai_messages").select("id").eq("chat_id", cId).limit(1);
        if (cancelled) return;

        if (!(firstMsg?.length ?? 0) && !bootstrappedClaimChatKeys.has(bootKey)) {
          setBootstrapping(true);
          try {
            const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
              body: {
                chat_id: cId,
                journal_entry_id: eId,
                mode: "journal",
                journal_bootstrap_opener: true,
                include_general_knowledge: includeGeneralRef.current,
                journal_bootstrap_artifact_claim_id: research.claimId,
                journal_bootstrap_transcript_excerpt: research.transcriptExcerpt ?? null,
              },
            });
            if (cancelled) return;
            if (error) throw new Error(error.message);
            const payload = data as MyAiInvokeOk | { error?: string } | null;
            if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
              throw new Error(payload.error);
            }
            bootstrappedClaimChatKeys.add(bootKey);
          } catch (e) {
            if (!cancelled) {
              toast({ title: "Could not start conversation", description: String(e), variant: "destructive" });
            }
          } finally {
            if (!cancelled) setBootstrapping(false);
          }
        }
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
  }, [userId, research.artifactId, research.claimId, research.artifactTitle, research.transcriptExcerpt, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, bootstrapping]);

  const stop = () => {
    ignoreResult.current = true;
    sendingRef.current = false;
    setSending(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sendingRef.current || !chatId || !entryId) return;
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

  const applyClaimVerdict = async (verdict: "keep" | "reject" | "updated") => {
    setClaimVerdictBusy(true);
    try {
      const { error } = await supabase
        .from("artifact_claims")
        .update({ verdict })
        .eq("id", research.claimId)
        .eq("user_id", userId);
      if (error) throw error;
      const label = verdict === "keep" ? "Marked keep" : verdict === "reject" ? "Marked reject" : "Marked updated";
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-border pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="fj-outside" className="text-xs font-medium leading-snug text-foreground">
              Include broader Christian / scholarly context (general knowledge)
            </Label>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              When on, the model may summarize common views from training data. This is not live web search.
            </p>
          </div>
          <Switch
            id="fj-outside"
            className="mt-0.5 shrink-0"
            checked={includeGeneral}
            onCheckedChange={(v) => setIncludeGeneral(Boolean(v))}
          />
        </div>
        {entryId ? (
          <Button variant="link" className="h-auto p-0 text-xs" asChild>
            <Link to={`/journal/chat/${entryId}`}>Open full chat journal</Link>
          </Button>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-primary/20 bg-primary/[0.06] py-2 dark:bg-primary/[0.09]">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">Claim</div>
        <p className="mt-0.5 text-xs leading-snug text-foreground">{research.claimPreview}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" asChild>
            <Link to={`/framework/artifacts/${research.artifactId}`}>Artifact</Link>
          </Button>
          {research.matchedBeliefId ? (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" asChild>
              <Link to={`/framework/beliefs/${research.matchedBeliefId}`}>Belief</Link>
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="default"
            className="h-7 text-[11px]"
            disabled={packLoading}
            onClick={() => void runResearchPack()}
          >
            {packLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Research pack
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-[11px]"
            disabled={claimVerdictBusy}
            onClick={() => void applyClaimVerdict("updated")}
          >
            Updated
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={claimVerdictBusy} onClick={() => void applyClaimVerdict("keep")}>
            Keep
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" disabled={claimVerdictBusy} onClick={() => void applyClaimVerdict("reject")}>
            Reject
          </Button>
        </div>
      </div>

      <Sheet open={packOpen} onOpenChange={setPackOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
            <SheetTitle className="text-sm">Research pack</SheetTitle>
            <p className="text-[11px] font-normal leading-relaxed text-muted-foreground">
              Retrieval-first: scripture text is fetched from your app&apos;s Bible API. Other lenses are model synthesis with explicit epistemic labels—not verified citations.
            </p>
            <div className="mt-2 flex items-start justify-between gap-3 border-t border-border pt-2">
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="fj-pack-web" className="text-[11px] text-foreground">
                  Optional web search (Brave / SerpAPI)
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Requires Edge secrets. Off unless you enable here before generating.
                </p>
              </div>
              <Switch id="fj-pack-web" className="shrink-0" checked={packUseWeb} onCheckedChange={(v) => setPackUseWeb(Boolean(v))} />
            </div>
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

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-2">
        {showLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-70" />
          </div>
        )}
        {!showLoading && loadingMessages && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-70" />
          </div>
        )}
        {!showLoading && !loadingMessages && (
          <div className="space-y-3 pr-0.5">
            {messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => (
              <div key={m.id} className={cn(m.role === "user" && "flex justify-end")}>
                {m.role === "user" ? (
                  <div className="max-w-[92%] rounded-xl rounded-tr-sm bg-primary px-2.5 py-2 text-xs text-primary-foreground whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[94%] rounded-xl rounded-tl-sm border border-border/70 bg-card px-2.5 py-2 text-xs shadow-sm">
                    <div className="prose prose-xs max-w-none dark:prose-invert text-foreground">
                      {m.content ? <ReactMarkdown>{m.content}</ReactMarkdown> : <TypingDots />}
                    </div>
                    <CitationChips citations={parseCitationsJson(m.citations)} />
                  </div>
                )}
              </div>
            ))}
            {(sending || bootstrapping) && (
              <div className="max-w-[94%] rounded-xl rounded-tl-sm border border-border/70 bg-card px-2.5 py-2 text-xs shadow-sm">
                <div className="prose prose-xs max-w-none text-muted-foreground">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border pt-2">
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" disabled={sending || !messages.some((m) => m.role === "assistant")} onClick={() => void retryLast()}>
            <RefreshCw className="mr-1 h-3 w-3" /> Retry
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" disabled={!sending} onClick={stop}>
            <Square className="mr-1 h-3 w-3" /> Stop
          </Button>
        </div>
        <div className="flex items-end gap-1.5">
          <PolishedTextarea
            ref={taRef}
            polishResetKey={entryId ?? chatId ?? "fj-claim-chat"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending && !bootstrapping) void send();
              }
            }}
            rows={2}
            disabled={sending || bootstrapping || showLoading}
            placeholder={sending || bootstrapping ? "Thinking…" : "Ask about this claim…"}
            className="min-h-[48px] flex-1 resize-none bg-background text-xs"
          />
          <Button type="button" size="icon" className="h-9 w-9 shrink-0" disabled={sending || bootstrapping || showLoading || !input.trim()} onClick={() => void send()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
