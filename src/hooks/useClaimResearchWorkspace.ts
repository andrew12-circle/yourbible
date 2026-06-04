import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import { floatingJournalInsertRef } from "@/lib/journal/floatingJournalInsertRef";
import type { FloatingClaimResearchHandoff } from "@/lib/journal/floatingJournalStore";
import { useFloatingJournalStore } from "@/lib/journal/floatingJournalStore";
import {
  buildBriefSummaryFromPack,
  fetchLatestClaimResearchRun,
  saveClaimResearchRun,
  touchClaimResearchRunChat,
  touchClaimResearchRunVerdict,
  type ClaimResearchRunRow,
} from "@/lib/framework/claimResearchRuns";
import { logClaimResearchEvent } from "@/lib/framework/claimResearchAnalytics";
import {
  formatResearchPackMarkdown,
  webSearchStatusLabel,
  type ResearchPackResp,
} from "@/lib/framework/claimResearchPack";
import type { ClaimVerdict } from "@/lib/framework/claimVerdict";

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

const LS_INCLUDE_GENERAL = "journal_chat.include_general";
const LS_PACK_WEB = "journal_chat.claim_research_web";

function readIncludeGeneralDefault(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(LS_INCLUDE_GENERAL);
  if (v === "0" || v === "false") return false;
  return true;
}

function readPackWebDefault(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LS_PACK_WEB) === "1";
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

    await supabase.from("journal_entry_links").insert({
      user_id: userId,
      entry_id: ent.id,
      target_kind: "artifact",
      target_ref: { id: artifactId },
    });

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

export function useClaimResearchWorkspace(userId: string, research: FloatingClaimResearchHandoff) {
  const navigate = useNavigate();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loadingShell, setLoadingShell] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readIncludeGeneralDefault);
  const [packUseWeb, setPackUseWeb] = useState(readPackWebDefault);
  const [verdictBusy, setVerdictBusy] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [chatBootstrapping, setChatBootstrapping] = useState(false);
  const [packData, setPackData] = useState<ResearchPackResp | null>(null);
  const [packInstance, setPackInstance] = useState(0);
  const [latestRun, setLatestRun] = useState<ClaimResearchRunRow | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [beliefUpdateOpen, setBeliefUpdateOpen] = useState(false);
  const sendingRef = useRef(false);
  const ignoreResult = useRef(false);
  const briefStartedRef = useRef(false);
  const openerDoneRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_INCLUDE_GENERAL, includeGeneral ? "1" : "0");
  }, [includeGeneral]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_PACK_WEB, packUseWeb ? "1" : "0");
  }, [packUseWeb]);

  const loadMessages = useCallback(async (cId: string) => {
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
  }, []);

  const invokeValidationPack = useCallback(
    async (question?: string) => {
      const { data, error } = await supabase.functions.invoke<ResearchPackResp>("claim-research-pack", {
        body: {
          artifact_claim_id: research.claimId,
          pack_type: "validation",
          user_question: question?.trim() || undefined,
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
    },
    [research.claimId, packUseWeb],
  );

  const persistPack = useCallback(
    async (pack: ResearchPackResp, userQuestion?: string) => {
      const run = await saveClaimResearchRun(supabase, {
        userId,
        claimId: research.claimId,
        artifactId: research.artifactId,
        pack,
        useWeb: packUseWeb,
        userQuestion,
      });
      if (run) setLatestRun(run);
      return run;
    },
    [userId, research.claimId, research.artifactId, packUseWeb],
  );

  const loadOrRunBrief = useCallback(
    async (force = false) => {
      if (briefLoading && !force) return;
      setBriefLoading(true);
      try {
        if (!force) {
          const cached = await fetchLatestClaimResearchRun(supabase, userId, research.claimId);
          if (cached?.pack_json) {
            setPackData(cached.pack_json);
            setLatestRun(cached);
            setPackInstance((n) => n + 1);
            void logClaimResearchEvent(supabase, {
              userId,
              claimId: research.claimId,
              artifactId: research.artifactId,
              eventType: "brief_cached",
            });
            return cached.pack_json;
          }
        }

        const pack = await invokeValidationPack();
        setPackData(pack);
        setPackInstance((n) => n + 1);
        await persistPack(pack);
        void logClaimResearchEvent(supabase, {
          userId,
          claimId: research.claimId,
          artifactId: research.artifactId,
          eventType: "brief_loaded",
          metadata: { use_web: packUseWeb },
        });
        return pack;
      } finally {
        setBriefLoading(false);
      }
    },
    [briefLoading, userId, research.claimId, research.artifactId, invokeValidationPack, persistPack, packUseWeb],
  );

  const runBootstrapOpener = useCallback(
    async (cId: string, eId: string) => {
      if (openerDoneRef.current) return;
      openerDoneRef.current = true;
      const { data, error } = await supabase.functions.invoke<MyAiInvokeOk>("my-ai-chat", {
        body: {
          chat_id: cId,
          journal_entry_id: eId,
          mode: "journal",
          journal_bootstrap_opener: true,
          journal_bootstrap_artifact_claim_id: research.claimId,
          journal_bootstrap_transcript_excerpt: research.transcriptExcerpt ?? null,
          include_general_knowledge: includeGeneral,
          artifact_claim_id: research.claimId,
        },
      });
      if (error) throw new Error(error.message);
      const payload = data as MyAiInvokeOk | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      await loadMessages(cId);
    },
    [research.claimId, research.transcriptExcerpt, includeGeneral, loadMessages],
  );

  useEffect(() => {
    let cancelled = false;
    briefStartedRef.current = false;
    openerDoneRef.current = false;

    (async () => {
      setLoadingShell(true);
      setEntryId(null);
      setChatId(null);
      setMessages([]);
      setPackData(null);
      setLatestRun(null);

      try {
        void logClaimResearchEvent(supabase, {
          userId,
          claimId: research.claimId,
          artifactId: research.artifactId,
          eventType: "opened",
        });

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
        if (cancelled) return;
        setLoadingShell(false);

        const runBrief = async () => {
          if (briefStartedRef.current) return;
          briefStartedRef.current = true;
          setBriefLoading(true);
          try {
            const cached = await fetchLatestClaimResearchRun(supabase, userId, research.claimId);
            if (cached?.pack_json) {
              setPackData(cached.pack_json);
              setLatestRun(cached);
              setPackInstance((n) => n + 1);
              void logClaimResearchEvent(supabase, {
                userId,
                claimId: research.claimId,
                artifactId: research.artifactId,
                eventType: "brief_cached",
              });
              return;
            }
            const pack = await invokeValidationPack();
            if (cancelled) return;
            setPackData(pack);
            setPackInstance((n) => n + 1);
            const run = await saveClaimResearchRun(supabase, {
              userId,
              claimId: research.claimId,
              artifactId: research.artifactId,
              pack,
              useWeb: packUseWeb,
            });
            if (run) setLatestRun(run);
            void logClaimResearchEvent(supabase, {
              userId,
              claimId: research.claimId,
              artifactId: research.artifactId,
              eventType: "brief_loaded",
              metadata: { use_web: packUseWeb },
            });
          } catch (e) {
            if (!cancelled) {
              toast({
                title: "Brief could not load",
                description: String(e),
                variant: "destructive",
              });
            }
          } finally {
            if (!cancelled) setBriefLoading(false);
          }
        };
        void runBrief();

        const { count } = await supabase
          .from("my_ai_messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", cId)
          .in("role", ["user", "assistant"]);
        if (!cancelled && (count ?? 0) === 0) {
          setChatBootstrapping(true);
          void runBootstrapOpener(cId, eId)
            .catch((e) => {
              if (!cancelled) {
                toast({ title: "Could not start chat", description: String(e), variant: "destructive" });
              }
            })
            .finally(() => {
              if (!cancelled) setChatBootstrapping(false);
            });
        }
      } catch (e) {
        if (!cancelled) {
          toast({ title: "Could not open claim research", description: String(e), variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingShell(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per claim session
  }, [userId, research.artifactId, research.claimId, research.artifactTitle]);

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
          artifact_claim_id: research.claimId,
        },
      });
      if (ignoreResult.current) return;
      if (error) throw new Error(error.message);
      const payload = data as MyAiInvokeOk | { error?: string } | null;
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        throw new Error(payload.error);
      }
      if (latestRun?.id) void touchClaimResearchRunChat(supabase, latestRun.id, userId);
      void logClaimResearchEvent(supabase, {
        userId,
        claimId: research.claimId,
        artifactId: research.artifactId,
        eventType: "message_sent",
      });
      await loadMessages(payload?.chat_id ?? chatId);
    } catch (e) {
      if (!ignoreResult.current) {
        toast({ title: "Message failed", description: String(e), variant: "destructive" });
        setInput(text);
      }
    } finally {
      sendingRef.current = false;
      if (!ignoreResult.current) setSending(false);
      ignoreResult.current = false;
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
          artifact_claim_id: research.claimId,
        },
      });
      if (error) throw new Error(error.message);
      await loadMessages(chatId);
      void data;
    } catch (e) {
      toast({ title: "Retry failed", description: String(e), variant: "destructive" });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const applyVerdict = async (verdict: ClaimVerdict) => {
    setVerdictBusy(true);
    try {
      const deferred_at = verdict === "defer" ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("artifact_claims")
        .update({ verdict, deferred_at })
        .eq("id", research.claimId)
        .eq("user_id", userId);
      if (error) throw error;
      useFloatingJournalStore.getState().publishClaimVerdictPatch({
        artifactId: research.artifactId,
        claimId: research.claimId,
        verdict,
        deferred_at,
      });
      if (latestRun?.id) void touchClaimResearchRunVerdict(supabase, latestRun.id, userId, verdict);
      void logClaimResearchEvent(supabase, {
        userId,
        claimId: research.claimId,
        artifactId: research.artifactId,
        eventType: "verdict_set",
        metadata: { verdict },
      });
      const label =
        verdict === "keep"
          ? "Marked keep"
          : verdict === "reject"
            ? "Marked reject"
            : verdict === "defer"
              ? "Saved for later"
              : verdict === "updated"
                ? "Marked updated"
                : "Verdict saved";
      toast({ title: label });
      if (verdict === "updated" && research.matchedBeliefId) {
        setBeliefUpdateOpen(true);
      }
    } catch (e) {
      toast({ title: "Could not update claim", description: String(e), variant: "destructive" });
    } finally {
      setVerdictBusy(false);
    }
  };

  const openFullReport = async () => {
    setPackOpen(true);
    void logClaimResearchEvent(supabase, {
      userId,
      claimId: research.claimId,
      artifactId: research.artifactId,
      eventType: "full_report_opened",
    });
    if (packData) return;
    setReportLoading(true);
    try {
      await loadOrRunBrief(true);
    } catch (e) {
      toast({ title: "Research pack failed", description: String(e), variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const refreshBrief = async () => {
    setBriefLoading(true);
    try {
      await loadOrRunBrief(true);
      toast({ title: "Brief refreshed" });
    } catch (e) {
      toast({ title: "Refresh failed", description: String(e), variant: "destructive" });
    } finally {
      setBriefLoading(false);
    }
  };

  const reflectToJournal = () => {
    const conclusion = messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .slice(-1)[0];
    const block = [
      research.claimMarkdown,
      "",
      "## Research conclusion",
      conclusion?.trim() ||
        buildBriefSummaryFromPack(
          packData ?? ({ sections: { synthesis: { body: "", epistemic: "unknown" } } } as ResearchPackResp),
        ),
    ].join("\n");

    const ref = floatingJournalInsertRef.current;
    if (ref?.artifactId === research.artifactId) {
      ref.append(`\n\n${block}\n\n`);
      toast({ title: "Appended to Write tab" });
      void logClaimResearchEvent(supabase, {
        userId,
        claimId: research.claimId,
        artifactId: research.artifactId,
        eventType: "reflect_saved",
        metadata: { via: "write_tab" },
      });
      return;
    }

    const qs = new URLSearchParams();
    qs.set("returnTo", encodeURIComponent(`/framework/artifacts/${research.artifactId}`));
    qs.set("artifactClaims", encodeURIComponent(block.slice(0, 8000)));
    if (research.artifactTitle) qs.set("artifactTitle", encodeURIComponent(research.artifactTitle));
    navigate(`/journal/new?${qs.toString()}`);
    void logClaimResearchEvent(supabase, {
      userId,
      claimId: research.claimId,
      artifactId: research.artifactId,
      eventType: "reflect_saved",
      metadata: { via: "journal_new" },
    });
  };

  const packMarkdown = packData ? formatResearchPackMarkdown(packData) : "";
  const briefSummary = packData
    ? latestRun?.brief_summary ?? buildBriefSummaryFromPack(packData)
    : null;
  const showLoading = loadingShell || !chatId || !entryId;
  const visibleMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");

  return {
    entryId,
    chatId,
    messages: visibleMessages,
    showLoading,
    loadingMessages,
    sending,
    input,
    setInput,
    includeGeneral,
    setIncludeGeneral,
    packUseWeb,
    setPackUseWeb,
    verdictBusy,
    packOpen,
    setPackOpen,
    briefLoading,
    reportLoading,
    chatBootstrapping,
    packData,
    packInstance,
    packMarkdown,
    briefSummary,
    latestRun,
    beliefUpdateOpen,
    setBeliefUpdateOpen,
    stop,
    send,
    retryLast,
    applyVerdict,
    openFullReport,
    refreshBrief,
    reflectToJournal,
    webStatusLabel: packData?.meta ? webSearchStatusLabel(packData.meta) : null,
  };
}
