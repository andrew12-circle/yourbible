import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { callChatJson, callOpenAiWebResearchChat, getChatConfig } from "../_shared/aiProvider.ts";
import { clearAiUsageContext, setAiUsageContext } from "../_shared/logAiUsage.ts";
import { buildClaimChatWebBlock, isExternalWebSearchConfigured } from "../_shared/researchPackCore.ts";
import { buildFrameworkRetrievalContext, buildPartnerWalkingAppendixForAi } from "./retrieval.ts";
import { parseResponseDepthSetting, resolveResponseDepth, type ResolvedResponseDepth } from "./responseDepth.ts";
import { titleFromFirstMessage, claimResearchTitleFromClaim } from "../_shared/chatTitle.ts";
import { buildJournalChatSystemPrompt, buildJournalChatWebResearchSystemPrompt, buildMyAiSystemPrompt, buildMyAiWebResearchSystemPrompt, parseCompanionMode, type MyAiCompanionMode } from "./systemPrompt.ts";
import { createStreamingChatResponse } from "./streamTurn.ts";
import { finalizeChatCitations } from "./enrichCitations.ts";
import { attachSourceAttribution } from "../_shared/chatSourceAttribution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Citation = {
  source_type: "belief" | "journal" | "artifact" | "entity" | "identity" | "general" | "influence";
  id?: string;
  label: string;
  url?: string;
  start_seconds?: number;
};

type RequestBody = {
  chat_id?: string | null;
  message?: string;
  include_general_knowledge?: boolean;
  mode?: "chat" | "journal";
  journal_entry_id?: string | null;
  journal_bootstrap_opener?: boolean;
  /** When bootstrapping, scope the opener to this artifact_claim row (must belong to the user). */
  journal_bootstrap_artifact_claim_id?: string | null;
  /** Optional transcript excerpt from the client (e.g. "Source in transcript"); capped server-side. */
  journal_bootstrap_transcript_excerpt?: string | null;
  /** When set, latest saved validation pack for this claim is injected into chat context. */
  artifact_claim_id?: string | null;
  /** When use_web is true with artifact_claim_id, live web snippets are fetched for this turn. */
  claim_research?: { use_web?: boolean };
  /** When bootstrapping, scope the opener to this hard question row (must belong to the user). */
  journal_bootstrap_hard_question_id?: string | null;
  /** When set, latest saved research pack for this hard question is injected into chat context. */
  hard_question_id?: string | null;
  finalize_journal_entry_id?: string | null;
  /** Standalone My AI thread → new journal entry with transcript + summary. */
  export_chat_to_journal_id?: string | null;
  retry_last?: boolean;
  /** When true (default), stream markdown tokens via SSE. Set false for legacy JSON ranked reply. */
  stream?: boolean;
  /** Edit a user message: truncate thread after this id, update content, regenerate assistant reply. */
  edit_user_message_id?: string | null;
  /** auto | reflect | deep — controls substantive vs reflective replies. */
  response_depth?: "auto" | "reflect" | "deep";
  /** chatgpt (default) | inward — ChatGPT-first vs library-first companion. */
  companion_mode?: "chatgpt" | "inward";
  /** Per-turn inward/outward mode from My AI composer chips. */
  research_scope?: "library" | "outside" | "web";
};

const BRACKET_CITATION_RE = /\[(?:artifact|journal|belief|entity|influence|tension):[0-9a-f-]{36}\]/i;

function hasRawBracketCitations(reply: string): boolean {
  return BRACKET_CITATION_RE.test(reply);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sanitizeSectionBody(body: string): string {
  let text = body.trim();
  text = text.replace(/^Epistemic:\s*[\w.]+\s*(\n+|$)/i, "");
  return text.trim();
}

const WEB_CHAT_TURN_INSTRUCTIONS = `# Web-augmented turn
Live web search snippets are appended below (when enabled). For this reply:
- Answer substantively like a careful research assistant — not only empathy and a question.
- Name specific teachers, scholars, articles, or traditions from the snippets when relevant.
- Use short markdown sections: blank lines between paragraphs; bullet lists for multiple voices or examples.
- Blend web findings with the user's framework context and saved research brief; flag when something is from a web snippet vs training knowledge.
- If snippets are thin or empty, say so plainly and lean on framework + brief.`;

async function loadClaimTextForWeb(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  claimId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("artifact_claims")
    .select("claim, user_id")
    .eq("id", claimId)
    .maybeSingle();
  if (error || !data || data.user_id !== userId) return null;
  const claim = typeof data.claim === "string" ? data.claim.trim() : "";
  return claim || null;
}

async function loadClaimChatWebBlock(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  claimId: string,
  userQuestion: string,
): Promise<string> {
  const claimText = await loadClaimTextForWeb(supabase, userId, claimId);
  if (!claimText) return "";
  const ws = await buildClaimChatWebBlock(claimText, userQuestion);
  return ws.usedWeb ? `${WEB_CHAT_TURN_INSTRUCTIONS}\n\n${ws.block}` : ws.block;
}

function shouldUseOpenAiWebResearch(chatUseWeb: boolean, chatCfg: ReturnType<typeof getChatConfig>): boolean {
  if (!chatUseWeb || "error" in chatCfg || chatCfg.provider !== "openai") return false;
  if (isExternalWebSearchConfigured()) return false;
  return true;
}

function buildClaimChatUserPayload(
  contextBlock: string,
  researchPackBlock: string,
  webBlock: string,
  message: string,
  jsonReply = true,
): string {
  const tail = jsonReply
    ? "Return only JSON as specified in the system instructions."
    : "Answer the user message using the context above.";
  return `${contextBlock}\n\n${researchPackBlock ? `${researchPackBlock}\n\n---\n` : ""}${webBlock ? `${webBlock}\n\n---\n` : ""}User message:\n${message}\n\n${tail}`;
}

async function generateClaimChatReply(
  journalMode: boolean,
  includeGeneral: boolean,
  partnerAppendix: string,
  contextBlock: string,
  researchPackBlock: string,
  webBlock: string,
  message: string,
  resolvedDepth: ResolvedResponseDepth,
  chatUseWeb: boolean,
  claimPackId: string,
  companionMode: MyAiCompanionMode = "inward",
): Promise<
  | { error: string }
  | {
    reply: string;
    citations: Citation[];
    ranked: Awaited<ReturnType<typeof generateRankedReply>> | null;
  }
> {
  const chatCfg = getChatConfig();
  if ("error" in chatCfg) return { error: chatCfg.error };

  if (shouldUseOpenAiWebResearch(chatUseWeb, chatCfg)) {
    const systemText = claimPackId || journalMode
      ? buildJournalChatWebResearchSystemPrompt(includeGeneral, partnerAppendix)
      : buildMyAiWebResearchSystemPrompt(includeGeneral, partnerAppendix);
    const userPayload = buildClaimChatUserPayload(contextBlock, researchPackBlock, "", message, false);
    const webRes = await callOpenAiWebResearchChat(systemText, userPayload);
    if (webRes.ok && webRes.rawText.trim()) {
      const parsed = parseAssistantPayload(webRes.rawText);
      const reply = parsed.reply.trim() || webRes.rawText.trim();
      const citations = dedupeCitations([
        ...parsed.citations,
        { source_type: "general", label: "Web search (OpenAI)" },
      ]);
      return {
        reply,
        citations: attachSourceAttribution(citations, { includeGeneral, usedWeb: true }),
        ranked: null,
      };
    }
    console.warn("[my-ai-chat] OpenAI web search failed, falling back to chat:", webRes.err);
  }

  const usedWebFromBlock = Boolean(webBlock.trim());
  const systemText = journalMode
    ? buildJournalChatSystemPrompt(includeGeneral, partnerAppendix, resolvedDepth, companionMode)
    : buildMyAiSystemPrompt(includeGeneral, partnerAppendix, resolvedDepth, companionMode);
  const userPayload = buildClaimChatUserPayload(contextBlock, researchPackBlock, webBlock, message, true);
  const ranked = await generateRankedReply(systemText, userPayload, message, resolvedDepth);
  if ("error" in ranked) return { error: ranked.error };
  return {
    reply: ranked.winner.reply,
    citations: attachSourceAttribution(ranked.winner.citations, { includeGeneral, usedWeb: usedWebFromBlock }),
    ranked,
  };
}

async function loadClaimResearchPackBlock(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  claimId: string,
  maxChars = 8000,
): Promise<string> {
  const { data, error } = await supabase
    .from("artifact_claim_research_runs")
    .select("pack_json,brief_summary,created_at")
    .eq("user_id", userId)
    .eq("artifact_claim_id", claimId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return "";

  const brief = typeof data.brief_summary === "string" ? data.brief_summary.trim() : "";
  const pack = data.pack_json;
  if (!isRecord(pack) || !isRecord(pack.sections)) {
    return brief ? `## Claim research brief (saved)\n\n${brief}` : "";
  }

  const sections = pack.sections as Record<string, { body?: string; epistemic?: string }>;
  const lines: string[] = [
    "## Claim research brief (saved — use for grounded answers; do not dump raw markdown to the user)",
    "",
  ];
  if (brief) {
    lines.push(brief, "");
  }
  const lensOrder = isRecord(pack.meta) && Array.isArray(pack.meta.lenses)
    ? (pack.meta.lenses as string[]).filter((x) => typeof x === "string")
    : ["bible_alignment", "historical_context", "independent_voices"];
  for (const id of lensOrder) {
    const s = sections[id];
    const body = typeof s?.body === "string" ? sanitizeSectionBody(s.body) : "";
    if (!body) continue;
    lines.push(`### ${id}`, body, "");
  }
  let block = lines.join("\n").trim();
  if (block.length > maxChars) block = `${block.slice(0, maxChars)}\n\n_(Pack truncated.)_`;
  return block;
}

async function loadHardQuestionResearchPackBlock(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  questionId: string,
  maxChars = 8000,
): Promise<string> {
  const { data, error } = await supabase
    .from("hard_question_research_runs")
    .select("pack_json,brief_summary,created_at")
    .eq("user_id", userId)
    .eq("hard_question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return "";

  const brief = typeof data.brief_summary === "string" ? data.brief_summary.trim() : "";
  const pack = data.pack_json;
  if (!isRecord(pack) || !isRecord(pack.sections)) {
    return brief ? `## Hard question research brief (saved)\n\n${brief}` : "";
  }

  const sections = pack.sections as Record<string, { body?: string; epistemic?: string }>;
  const lines: string[] = [
    "## Hard question research brief (saved — use for grounded answers; do not dump raw markdown to the user)",
    "",
  ];
  if (brief) lines.push(brief, "");
  const lensOrder = isRecord(pack.meta) && Array.isArray(pack.meta.lenses)
    ? (pack.meta.lenses as string[]).filter((x) => typeof x === "string")
    : ["scripture_context", "opposing_views", "synthesis"];
  for (const id of lensOrder) {
    const s = sections[id];
    const body = typeof s?.body === "string" ? sanitizeSectionBody(s.body) : "";
    if (!body) continue;
    lines.push(`### ${id}`, body, "");
  }
  let block = lines.join("\n").trim();
  if (block.length > maxChars) block = `${block.slice(0, maxChars)}\n\n_(Pack truncated.)_`;
  return block;
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence ? fence[1].trim() : t;
}

function isCitationSourceType(v: string): v is Citation["source_type"] {
  return v === "belief" || v === "journal" || v === "artifact" || v === "entity" || v === "identity" ||
    v === "general" || v === "influence";
}

function parseCitationEntry(v: unknown): Citation | null {
  if (!isRecord(v)) return null;
  const st = typeof v.source_type === "string" ? v.source_type.trim() : "";
  if (!isCitationSourceType(st)) return null;
  const label = typeof v.label === "string" ? v.label.trim() : "";
  if (!label) return null;
  const id = typeof v.id === "string" && /^[0-9a-f-]{36}$/i.test(v.id) ? v.id : undefined;
  return id ? { source_type: st, id, label } : { source_type: st, label };
}

function parseModelJson(text: string): { reply: string; citations: Citation[] } | null {
  const raw = stripJsonFence(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  if (!reply) return null;
  const rawCites = parsed.citations;
  const citations: Citation[] = [];
  if (Array.isArray(rawCites)) {
    for (const c of rawCites) {
      const p = parseCitationEntry(c);
      if (p) citations.push(p);
    }
  }
  return { reply, citations };
}

const BRACKET_PATTERNS: { re: RegExp; source_type: Citation["source_type"]; label: string }[] = [
  { re: /\[belief:([0-9a-f-]{36})\]/gi, source_type: "belief", label: "Belief" },
  { re: /\[journal:([0-9a-f-]{36})\]/gi, source_type: "journal", label: "Journal entry" },
  { re: /\[artifact:([0-9a-f-]{36})\]/gi, source_type: "artifact", label: "Artifact" },
  { re: /\[entity:([0-9a-f-]{36})\]/gi, source_type: "entity", label: "Entity" },
  { re: /\[influence:([0-9a-f-]{36})\]/gi, source_type: "influence", label: "Influence" },
];

function extractBracketCitations(reply: string): Citation[] {
  const out: Citation[] = [];
  for (const { re, source_type, label } of BRACKET_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(reply)) !== null) {
      const id = m[1];
      out.push({ source_type, id, label });
    }
  }
  return out;
}

function dedupeCitations(items: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of items) {
    const key = `${c.source_type}|${c.id ?? ""}|${c.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function looksLikeGeneralKnowledgeFallback(reply: string): Citation[] {
  const t = reply.toLowerCase();
  if (t.includes("nothing in your framework speaks") && t.includes("general knowledge")) {
    return [{ source_type: "general", label: "Outside knowledge (OpenAI)" }];
  }
  return [];
}

const CHAT_EXPORT_MARKER = "<!-- chat-export:v1 -->";

type ChatJournalMsg = { role: "user" | "assistant"; content: string };

function composeSavedChatJournalBody(summary: string, messages: ChatJournalMsg[]): string {
  const payload = JSON.stringify({ v: 1, messages });
  const summaryText = summary.trim();
  if (!summaryText) return `${CHAT_EXPORT_MARKER}\n${payload}`;
  return `${summaryText}\n\n${CHAT_EXPORT_MARKER}\n${payload}`;
}

function rowsToChatMessages(rows: { role: string; content: string }[]): ChatJournalMsg[] {
  return rows
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({
      role: r.role === "assistant" ? "assistant" as const : "user" as const,
      content: (r.content ?? "").trim(),
    }))
    .filter((m) => m.content.length > 0);
}

function fallbackChatSummary(messages: ChatJournalMsg[]): string {
  const firstAssistant = messages.find((m) => m.role === "assistant");
  if (!firstAssistant) return "";
  const t = firstAssistant.content.replace(/\s+/g, " ").trim();
  return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

function parseAssistantPayload(rawText: string): { reply: string; citations: Citation[] } {
  let reply = rawText;
  let citations: Citation[] = [];
  const parsed = parseModelJson(rawText);
  if (parsed) {
    reply = parsed.reply;
    citations = parsed.citations;
  } else {
    const loose = stripJsonFence(rawText);
    try {
      const j: unknown = JSON.parse(loose);
      if (isRecord(j) && typeof j.reply === "string" && j.reply.trim()) {
        reply = j.reply.trim();
      } else {
        reply = loose;
      }
    } catch {
      reply = loose;
    }
    citations = [];
  }
  const bracketCites = extractBracketCitations(reply);
  const fallbackGeneral = looksLikeGeneralKnowledgeFallback(reply);
  citations = dedupeCitations([...citations, ...bracketCites, ...fallbackGeneral]);
  return { reply, citations };
}

type Candidate = {
  index: number;
  temperature: number;
  reply: string;
  citations: Citation[];
};

type JudgeScore = {
  specificity: number;
  continuity: number;
  non_genericness: number;
  voice_match: number;
  emotional_resonance: number;
  substantive_help: number;
  citation_hygiene: number;
  total: number;
  rationale?: string;
};

const RUBRIC_KEYS_REFLECT = [
  "specificity",
  "continuity",
  "non_genericness",
  "voice_match",
  "emotional_resonance",
] as const;

function computeJudgeTotal(sc: JudgeScore, resolvedDepth: ResolvedResponseDepth): number {
  if (resolvedDepth === "deep") {
    return (
      sc.substantive_help * 2.5 +
      sc.specificity +
      sc.continuity +
      sc.non_genericness +
      sc.voice_match +
      sc.emotional_resonance +
      sc.citation_hygiene * 1.5
    );
  }
  return RUBRIC_KEYS_REFLECT.reduce((s, k) => s + sc[k], 0) + sc.citation_hygiene * 0.5;
}

async function generateRankedReply(
  systemText: string,
  userPayload: string,
  userMessage: string,
  resolvedDepth: ResolvedResponseDepth,
): Promise<
  {
    winner: Candidate;
    candidates: { cand: Candidate; score: JudgeScore | null; isWinner: boolean }[];
  } | { error: string }
> {
  const temps = [0.4, 0.7, 0.9];
  const results = await Promise.all(
    temps.map((t) => callChatJson(systemText, userPayload, t)),
  );
  const candidates: Candidate[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.ok || !r.rawText) continue;
    const parsed = parseAssistantPayload(r.rawText);
    if (!parsed.reply.trim()) continue;
    candidates.push({ index: i, temperature: temps[i], reply: parsed.reply, citations: parsed.citations });
  }
  if (candidates.length === 0) {
    return { error: results.find((r) => !r.ok)?.err ?? "All candidates failed" };
  }
  if (candidates.length === 1) {
    return {
      winner: candidates[0],
      candidates: [{ cand: candidates[0], score: null, isWinner: true }],
    };
  }

  const deepExtra = resolvedDepth === "deep"
    ? `
- substantive_help: offers usable reframing, insight, or biblical narrative examples — not only empathy plus a question (weight this heavily)
- citation_hygiene: 10 if reply has NO raw [journal:uuid] tokens in prose; 0 if bracket UUIDs appear in reply text`
    : `
- substantive_help: optional; score if present
- citation_hygiene: 10 if reply has NO raw [journal:uuid] tokens in prose; 0 if bracket UUIDs appear in reply text`;

  const judgeSys =
    `You are a strict rubric judge for a persistent cognitive companion. Score each candidate 1-10 on:
- specificity: names concrete particulars from context (beliefs, journal themes, their words) — not genericities
- continuity: references the user's evolution, recurring themes, or named transitions instead of treating this as a fresh turn
- non_genericness: avoids therapist filler ("it sounds like", "you've been on a journey", "thank you for sharing")
- voice_match: matches the user's voice_signature in vocabulary and cadence
- emotional_resonance: lands the actual emotional register of the user's message${deepExtra}
Return ONLY JSON with shape:
{"scores":[{"index":0,"specificity":N,"continuity":N,"non_genericness":N,"voice_match":N,"emotional_resonance":N,"substantive_help":N,"citation_hygiene":N,"rationale":"one short sentence"}, ...],"winner_index":N}`;

  const judgeUser = `User message:\n${userMessage}\n\nCandidates:\n${
    candidates
      .map((c) => `--- candidate ${c.index} (temp ${c.temperature}) ---\n${c.reply}`)
      .join("\n\n")
  }`;

  const judgeRes = await callChatJson(judgeSys, judgeUser, 0.1, 1024);

  const scoresByIndex = new Map<number, JudgeScore>();
  let winnerIndex = candidates[0].index;

  if (judgeRes.ok && judgeRes.rawText) {
    try {
      const parsed: unknown = JSON.parse(stripJsonFence(judgeRes.rawText));
      if (isRecord(parsed)) {
        const arr = parsed.scores;
        if (Array.isArray(arr)) {
          for (const row of arr) {
            if (!isRecord(row)) continue;
            const idx = typeof row.index === "number" ? row.index : -1;
            if (idx < 0) continue;
            const get = (k: string) => {
              const v = row[k];
              return typeof v === "number" ? Math.max(0, Math.min(10, v)) : 0;
            };
            const candReply = candidates.find((c) => c.index === idx)?.reply ?? "";
            const sc: JudgeScore = {
              specificity: get("specificity"),
              continuity: get("continuity"),
              non_genericness: get("non_genericness"),
              voice_match: get("voice_match"),
              emotional_resonance: get("emotional_resonance"),
              substantive_help: get("substantive_help"),
              citation_hygiene: hasRawBracketCitations(candReply) ? 0 : Math.max(get("citation_hygiene"), 8),
              total: 0,
              rationale: typeof row.rationale === "string" ? row.rationale.slice(0, 400) : undefined,
            };
            sc.total = computeJudgeTotal(sc, resolvedDepth);
            scoresByIndex.set(idx, sc);
          }
        }
        if (typeof parsed.winner_index === "number" && candidates.some((c) => c.index === parsed.winner_index)) {
          winnerIndex = parsed.winner_index;
        } else {
          let best = -Infinity;
          for (const c of candidates) {
            const s = scoresByIndex.get(c.index);
            if (s && s.total > best) {
              best = s.total;
              winnerIndex = c.index;
            }
          }
        }
      }
    } catch {
      /* keep default winner */
    }
  }

  const winner = candidates.find((c) => c.index === winnerIndex) ?? candidates[0];
  return {
    winner,
    candidates: candidates.map((c) => ({
      cand: c,
      score: scoresByIndex.get(c.index) ?? null,
      isWinner: c.index === winner.index,
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const chatCfg = getChatConfig();

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json()) as RequestBody;
    setAiUsageContext({
      functionName: "my-ai-chat",
      userId,
      chatId: typeof body.chat_id === "string" ? body.chat_id : null,
      journalEntryId: typeof body.journal_entry_id === "string" ? body.journal_entry_id : null,
    });

    const mode = body.mode === "journal" ? "journal" : "chat";
    const journalEntryId = typeof body.journal_entry_id === "string" && body.journal_entry_id.length
      ? body.journal_entry_id
      : null;

    // --- Finalize journal chat (transcript + optional title/tags) ---
    const finalizeId = typeof body.finalize_journal_entry_id === "string" && body.finalize_journal_entry_id.length
      ? body.finalize_journal_entry_id
      : null;
    if (finalizeId) {
      const { data: entry, error: entErr } = await supabase
        .from("journal_entries")
        .select("id,user_id,entry_kind,tags,title")
        .eq("id", finalizeId)
        .maybeSingle();
      if (entErr) return jsonResponse({ error: entErr.message }, 502);
      if (!entry || entry.user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);
      if (entry.entry_kind !== "chat") {
        return jsonResponse({ error: "Entry is not a chat journal" }, 400);
      }

      const { data: chatRow, error: chErr } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", finalizeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (chErr) return jsonResponse({ error: chErr.message }, 502);
      if (!chatRow?.id) {
        return jsonResponse({ error: "No chat thread linked to this entry" }, 400);
      }
      const chatIdFin = chatRow.id as string;

      const { data: msgs, error: mErr } = await supabase
        .from("my_ai_messages")
        .select("role,content")
        .eq("chat_id", chatIdFin)
        .order("created_at", { ascending: true });
      if (mErr) return jsonResponse({ error: mErr.message }, 502);

      const messages = rowsToChatMessages((msgs ?? []) as { role: string; content: string }[]);
      const transcriptForAi = messages
        .map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`)
        .join("\n\n");

      let titleOut: string | null = typeof entry.title === "string" ? entry.title : null;
      let tagsOut: string[] = Array.isArray(entry.tags) ? [...entry.tags] : [];
      let summaryText = "";

      if (!("error" in chatCfg) && transcriptForAi.trim()) {
        const sumSys =
          `You summarize a private faith-aware journaling conversation. Return a single JSON object only (no fences), keys: "title" (short string, <= 80 chars), "tags" (array of 3-8 short lowercase kebab-case theme strings), "summary" (one paragraph, <= 900 chars, warm and specific).`;
        const sumUser = `Transcript:\n\n${transcriptForAi.slice(0, 24_000)}`;
        const sumRes = await callChatJson(sumSys, sumUser);
        if (sumRes.ok && sumRes.rawText) {
          try {
            const j: unknown = JSON.parse(stripJsonFence(sumRes.rawText));
            if (isRecord(j)) {
              if (typeof j.title === "string" && j.title.trim()) titleOut = j.title.trim().slice(0, 120);
              if (typeof j.summary === "string" && j.summary.trim()) {
                summaryText = j.summary.trim();
              }
              if (Array.isArray(j.tags)) {
                const next = j.tags
                  .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
                  .map((t) => t.trim().slice(0, 40));
                const merged = [...new Set([...tagsOut, ...next, "chat-journal"])].slice(0, 16);
                tagsOut = merged;
              }
            }
          } catch {
            /* keep defaults */
          }
        }
      }

      if (!summaryText) summaryText = fallbackChatSummary(messages);
      const bodyMd = composeSavedChatJournalBody(summaryText, messages);

      const { error: upErr } = await supabase
        .from("journal_entries")
        .update({
          title: titleOut,
          tags: tagsOut,
          body: bodyMd,
          summary: summaryText || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", finalizeId)
        .eq("user_id", userId);
      if (upErr) return jsonResponse({ error: upErr.message }, 502);

      return jsonResponse({ ok: true, entry_id: finalizeId, title: titleOut, tags: tagsOut });
    }

    // --- Export standalone My AI chat to a new journal entry ---
    const exportChatId = typeof body.export_chat_to_journal_id === "string" && body.export_chat_to_journal_id.length
      ? body.export_chat_to_journal_id
      : null;
    if (exportChatId) {
      const { data: chatRow, error: chErr } = await supabase
        .from("my_ai_chats")
        .select("id,journal_entry_id,title")
        .eq("id", exportChatId)
        .eq("user_id", userId)
        .maybeSingle();
      if (chErr) return jsonResponse({ error: chErr.message }, 502);
      if (!chatRow?.id) return jsonResponse({ error: "Chat not found" }, 404);

      const linkedEntryId = (chatRow.journal_entry_id as string | null) ?? null;
      if (linkedEntryId) {
        const { data: linked } = await supabase
          .from("journal_entries")
          .select("entry_kind")
          .eq("id", linkedEntryId)
          .eq("user_id", userId)
          .maybeSingle();
        if (linked?.entry_kind === "chat") {
          return jsonResponse({
            error: "Use finalize for in-progress chat journal entries",
            journal_entry_id: linkedEntryId,
          }, 400);
        }
      }

      const { data: msgs, error: mErr } = await supabase
        .from("my_ai_messages")
        .select("role,content")
        .eq("chat_id", exportChatId)
        .order("created_at", { ascending: true });
      if (mErr) return jsonResponse({ error: mErr.message }, 502);

      const messages = rowsToChatMessages((msgs ?? []) as { role: string; content: string }[]);
      if (!messages.length) {
        return jsonResponse({ error: "Nothing to save yet — send a message first" }, 400);
      }
      const transcriptForAi = messages
        .map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`)
        .join("\n\n");

      const { data: journals, error: jErr } = await supabase
        .from("journals")
        .select("id,is_default")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (jErr) return jsonResponse({ error: jErr.message }, 502);
      const journalId =
        (journals ?? []).find((j: { is_default?: boolean }) => j.is_default)?.id ??
        (journals ?? [])[0]?.id ??
        null;
      if (!journalId) return jsonResponse({ error: "No journal found — create one first" }, 400);

      let titleOut =
        typeof chatRow.title === "string" && chatRow.title.trim()
          ? chatRow.title.trim().slice(0, 120)
          : `AI chat — ${new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}`;
      let tagsOut: string[] = ["from-my-ai"];
      let summaryText = "";

      if (!("error" in chatCfg)) {
        const sumSys =
          `You summarize a private faith-aware conversation. Return a single JSON object only (no fences), keys: "title" (short string, <= 80 chars), "tags" (array of 3-8 short lowercase kebab-case theme strings), "summary" (one paragraph, <= 900 chars, warm and specific).`;
        const sumUser = `Transcript:\n\n${transcriptForAi.slice(0, 24_000)}`;
        const sumRes = await callChatJson(sumSys, sumUser);
        if (sumRes.ok && sumRes.rawText) {
          try {
            const j: unknown = JSON.parse(stripJsonFence(sumRes.rawText));
            if (isRecord(j)) {
              if (typeof j.title === "string" && j.title.trim()) titleOut = j.title.trim().slice(0, 120);
              if (typeof j.summary === "string" && j.summary.trim()) {
                summaryText = j.summary.trim();
              }
              if (Array.isArray(j.tags)) {
                const next = j.tags
                  .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
                  .map((t) => t.trim().slice(0, 40));
                tagsOut = [...new Set([...tagsOut, ...next])].slice(0, 16);
              }
            }
          } catch {
            /* keep defaults */
          }
        }
      }

      if (!summaryText) summaryText = fallbackChatSummary(messages);
      const bodyMd = composeSavedChatJournalBody(summaryText, messages);
      const now = new Date();

      const { data: created, error: insErr } = await supabase
        .from("journal_entries")
        .insert({
          user_id: userId,
          journal_id: journalId,
          title: titleOut,
          body: bodyMd,
          summary: summaryText || null,
          tags: tagsOut,
          entry_kind: null,
          analyze_for_mirror: true,
          entry_at_ts: now.toISOString(),
          entry_at: now.toISOString().slice(0, 10),
        })
        .select("id")
        .maybeSingle();
      if (insErr) return jsonResponse({ error: insErr.message }, 502);
      if (!created?.id) return jsonResponse({ error: "Could not create journal entry" }, 502);

      return jsonResponse({ ok: true, entry_id: created.id as string, title: titleOut, tags: tagsOut });
    }

    if ("error" in chatCfg) {
      return jsonResponse({ error: chatCfg.error }, 502);
    }

    // --- Bootstrap: first assistant opener (no user message) ---
    if (body.journal_bootstrap_opener === true) {
      if (mode !== "journal" || !journalEntryId) {
        return jsonResponse({ error: "journal_bootstrap_opener requires mode=journal and journal_entry_id" }, 400);
      }
      const chatId = typeof body.chat_id === "string" && body.chat_id.length ? body.chat_id : null;
      if (!chatId) return jsonResponse({ error: "chat_id is required for bootstrap" }, 400);

      const { data: existing, error: exErr } = await supabase
        .from("my_ai_chats")
        .select("id,user_id,journal_entry_id")
        .eq("id", chatId)
        .maybeSingle();
      if (exErr) return jsonResponse({ error: exErr.message }, 502);
      if (!existing || existing.user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);
      if (existing.journal_entry_id !== journalEntryId) {
        return jsonResponse({ error: "Chat is not linked to this journal entry" }, 403);
      }

      const { data: jr, error: jrErr } = await supabase
        .from("journal_entries")
        .select("id,entry_kind,user_id")
        .eq("id", journalEntryId)
        .maybeSingle();
      if (jrErr) return jsonResponse({ error: jrErr.message }, 502);
      if (!jr || jr.user_id !== userId || jr.entry_kind !== "chat") {
        return jsonResponse({ error: "Invalid journal entry for chat bootstrap" }, 400);
      }

      const { count: userMsgCount, error: ucErr } = await supabase
        .from("my_ai_messages")
        .select("*", { count: "exact", head: true })
        .eq("chat_id", chatId)
        .eq("role", "user");
      if (ucErr) return jsonResponse({ error: ucErr.message }, 502);
      if ((userMsgCount ?? 0) > 0) {
        return jsonResponse({ error: "Bootstrap only allowed before the first user message" }, 400);
      }

      const claimIdRaw = typeof body.journal_bootstrap_artifact_claim_id === "string"
        ? body.journal_bootstrap_artifact_claim_id.trim()
        : "";
      const claimBootstrap = /^[0-9a-f-]{36}$/i.test(claimIdRaw) ? claimIdRaw : null;

      const hqIdRaw = typeof body.journal_bootstrap_hard_question_id === "string"
        ? body.journal_bootstrap_hard_question_id.trim()
        : "";
      const hardQuestionBootstrap = /^[0-9a-f-]{36}$/i.test(hqIdRaw) ? hqIdRaw : null;

      const excerptRaw = typeof body.journal_bootstrap_transcript_excerpt === "string"
        ? body.journal_bootstrap_transcript_excerpt.trim()
        : "";
      const transcriptExcerpt = excerptRaw ? excerptRaw.slice(0, 4000) : "";

      let claimFocusBlock = "";
      let openerSeed =
        "(The user just opened a new journaling session. No user message yet. Write a brief warm opener: acknowledge anything relevant from the context if it fits, invite them to share what feels alive or heavy today, mirror their possible tone without assuming facts you do not have, and end with one gentle question. Keep it concise.)";

      if (claimBootstrap) {
        const { data: claimRow, error: clErr } = await supabase
          .from("artifact_claims")
          .select(
            "id, artifact_id, claim, tone, doctrine_tags, bias_flags, scripture_supports, scripture_challenges, match_relation, matched_belief_id, user_id",
          )
          .eq("id", claimBootstrap)
          .maybeSingle();
        if (clErr) return jsonResponse({ error: clErr.message }, 502);
        if (!claimRow || claimRow.user_id !== userId) {
          return jsonResponse({ error: "Claim not found" }, 404);
        }

        const { data: artRow, error: artErr } = await supabase
          .from("artifacts")
          .select("id, title, kind, url, user_id")
          .eq("id", claimRow.artifact_id as string)
          .maybeSingle();
        if (artErr) return jsonResponse({ error: artErr.message }, 502);
        if (!artRow || artRow.user_id !== userId) {
          return jsonResponse({ error: "Artifact not found for claim" }, 404);
        }

        let beliefBlock = "";
        const mb = typeof claimRow.matched_belief_id === "string" ? claimRow.matched_belief_id.trim() : "";
        if (mb && /^[0-9a-f-]{36}$/i.test(mb)) {
          const { data: bel, error: bErr } = await supabase
            .from("belief_nodes")
            .select("topic, statement, layer")
            .eq("id", mb)
            .eq("user_id", userId)
            .maybeSingle();
          if (!bErr && bel) {
            const topic = typeof bel.topic === "string" ? bel.topic : "";
            const statement = typeof bel.statement === "string" ? bel.statement : "";
            const layer = typeof bel.layer === "string" ? bel.layer : "";
            beliefBlock =
              `\n## Their matched belief (from framework)\n- Topic: ${topic}\n- Layer: ${layer}\n- Statement: ${statement}\n`;
          }
        }

        const tagsLine = Array.isArray(claimRow.doctrine_tags)
          ? (claimRow.doctrine_tags as string[]).filter((t) => typeof t === "string" && t.trim()).join(", ")
          : "";
        const biasLine = Array.isArray(claimRow.bias_flags)
          ? (claimRow.bias_flags as string[]).filter((t) => typeof t === "string" && t.trim()).join(", ")
          : "";
        const tone = typeof claimRow.tone === "string" ? claimRow.tone : "";
        const rel = typeof claimRow.match_relation === "string" ? claimRow.match_relation : "";
        const claimText = typeof claimRow.claim === "string" ? claimRow.claim : "";
        const artTitle = typeof artRow.title === "string" ? artRow.title : "";
        const artKind = typeof artRow.kind === "string" ? artRow.kind : "";
        const artUrl = typeof artRow.url === "string" ? artRow.url : "";

        const supJson = (v: unknown) => {
          try {
            return JSON.stringify(v ?? []);
          } catch {
            return "[]";
          }
        };

        claimFocusBlock = [
          "## Session focus: one claim from their artifact",
          `Artifact: ${artTitle || "(untitled)"} (${artKind})`,
          artUrl ? `URL: ${artUrl}` : "",
          `[artifact:${artRow.id}]`,
          "",
          "### Claim text (verbatim)",
          claimText,
          "",
          tone ? `Tone (analysis): ${tone}` : "",
          tagsLine ? `Doctrine tags: ${tagsLine}` : "",
          biasLine ? `Bias / framing flags: ${biasLine}` : "",
          rel ? `Match vs their framework: ${rel}` : "",
          `Supports (JSON): ${supJson(claimRow.scripture_supports)}`,
          `Challenges (JSON): ${supJson(claimRow.scripture_challenges)}`,
          beliefBlock.trimEnd(),
          transcriptExcerpt
            ? `\n### Transcript excerpt near this moment (may be partial)\n${transcriptExcerpt}`
            : "",
        ].filter(Boolean).join("\n");

        openerSeed =
          "(The user opened this chat from ONE specific claim extracted from a video/article artifact — see \"Session focus\" above. No user message yet. Write a concise warm opener: name the claim in your own words (short), acknowledge why digging deeper here matters, invite them to share how they lean (agree / uneasy / disagree) and what they want to explore (scripture, history, practical life, emotional resonance). Offer to help them stress-test or research without preaching. End with ONE clear question. Do not invent that they watched the whole video.)";
      } else if (hardQuestionBootstrap) {
        const { data: hqRow, error: hqErr } = await supabase
          .from("framework_hard_questions")
          .select("id, title, framing, why_it_matters, current_thinking, tags, layer, user_id")
          .eq("id", hardQuestionBootstrap)
          .maybeSingle();
        if (hqErr) return jsonResponse({ error: hqErr.message }, 502);
        if (!hqRow || hqRow.user_id !== userId) {
          return jsonResponse({ error: "Hard question not found" }, 404);
        }
        const title = typeof hqRow.title === "string" ? hqRow.title : "";
        const framing = typeof hqRow.framing === "string" ? hqRow.framing : "";
        const why = typeof hqRow.why_it_matters === "string" ? hqRow.why_it_matters : "";
        const thinking = typeof hqRow.current_thinking === "string" ? hqRow.current_thinking : "";
        const layer = typeof hqRow.layer === "string" ? hqRow.layer : "";
        const tags = Array.isArray(hqRow.tags) ? (hqRow.tags as string[]).join(", ") : "";

        claimFocusBlock = [
          "## Session focus: hard theological question",
          `Question: ${title}`,
          framing ? `Framing: ${framing}` : "",
          why ? `Why it matters to them: ${why}` : "",
          thinking ? `Current thinking: ${thinking}` : "",
          layer ? `Framework layer: ${layer}` : "",
          tags ? `Tags: ${tags}` : "",
        ].filter(Boolean).join("\n");

        openerSeed =
          "(The user opened research on a hard theological question they chose — see \"Session focus\" above. No user message yet. Write a concise warm opener: restate the question briefly, honor that it is genuinely difficult, invite them to name what feels most threatening or unresolved, and offer to explore scripture, opposing views, and honest synthesis. End with ONE clear question. Do not preach or give a final answer yet.)";
      }

      const contextPack = await buildFrameworkRetrievalContext(
        supabase,
        userId,
        chatId,
        openerSeed + "\n" + claimFocusBlock,
        journalEntryId,
      );
      const partnerAppendix = await buildPartnerWalkingAppendixForAi(supabase, userId);
      const packClaimId = claimBootstrap ||
        (typeof body.artifact_claim_id === "string" && /^[0-9a-f-]{36}$/i.test(body.artifact_claim_id.trim())
          ? body.artifact_claim_id.trim()
          : "");
      const packHqId = hardQuestionBootstrap ||
        (typeof body.hard_question_id === "string" && /^[0-9a-f-]{36}$/i.test(body.hard_question_id.trim())
          ? body.hard_question_id.trim()
          : "");
      const researchPackBlock = packClaimId
        ? await loadClaimResearchPackBlock(supabase, userId, packClaimId)
        : packHqId
        ? await loadHardQuestionResearchPackBlock(supabase, userId, packHqId)
        : "";

      const bootstrapUseWeb = body.claim_research?.use_web === true;
      const bootstrapChatCfg = getChatConfig();
      const webBlock = bootstrapUseWeb && packClaimId
        ? await loadClaimChatWebBlock(supabase, userId, packClaimId, "")
        : "";

      let reply = "";
      let citations: Citation[] = [];
      const includeGeneral = body.include_general_knowledge === true;

      if (shouldUseOpenAiWebResearch(bootstrapUseWeb, bootstrapChatCfg)) {
        const systemText = buildJournalChatWebResearchSystemPrompt(includeGeneral, partnerAppendix);
        const userPayload =
          `${contextPack.contextBlock}\n\n${claimFocusBlock ? `${claimFocusBlock}\n\n---\n` : ""}${researchPackBlock ? `${researchPackBlock}\n\n---\n` : ""}${openerSeed}\n\nWrite the opening message.`;
        const webRes = await callOpenAiWebResearchChat(systemText, userPayload);
        if (webRes.ok && webRes.rawText.trim()) {
          const parsed = parseAssistantPayload(webRes.rawText);
          reply = parsed.reply.trim() || webRes.rawText.trim();
          citations = await finalizeChatCitations(
            supabase,
            userId,
            dedupeCitations([
              ...parsed.citations,
              { source_type: "general", label: "Web search (OpenAI)" },
            ]),
            { includeGeneral, usedWeb: true },
            contextPack.retrievedCitations,
          );
        } else {
          const bootstrapDepth = resolveResponseDepth(parseResponseDepthSetting(body.response_depth), openerSeed);
          const fallbackSystem = buildJournalChatSystemPrompt(includeGeneral, partnerAppendix, bootstrapDepth);
          const fallbackPayload =
            `${contextPack.contextBlock}\n\n${claimFocusBlock ? `${claimFocusBlock}\n\n---\n` : ""}${researchPackBlock ? `${researchPackBlock}\n\n---\n` : ""}${webBlock ? `${webBlock}\n\n---\n` : ""}${openerSeed}\n\nReturn only JSON as specified in the system instructions.`;
          const chatRes = await callChatJson(fallbackSystem, fallbackPayload);
          if (!chatRes.ok) {
            return jsonResponse({ error: chatRes.err ?? webRes.err ?? "AI chat failed" }, 502);
          }
          const parsed = parseAssistantPayload(chatRes.rawText);
          reply = parsed.reply;
          citations = await finalizeChatCitations(
            supabase,
            userId,
            parsed.citations,
            {
              includeGeneral,
              usedWeb: Boolean(webBlock.trim()),
            },
            contextPack.retrievedCitations,
          );
        }
      } else {
        const bootstrapDepth = resolveResponseDepth(parseResponseDepthSetting(body.response_depth), openerSeed);
        const systemText = buildJournalChatSystemPrompt(includeGeneral, partnerAppendix, bootstrapDepth);
        const userPayload =
          `${contextPack.contextBlock}\n\n${claimFocusBlock ? `${claimFocusBlock}\n\n---\n` : ""}${researchPackBlock ? `${researchPackBlock}\n\n---\n` : ""}${webBlock ? `${webBlock}\n\n---\n` : ""}${openerSeed}\n\nReturn only JSON as specified in the system instructions.`;
        const chatRes = await callChatJson(systemText, userPayload);
        if (!chatRes.ok) return jsonResponse({ error: chatRes.err ?? "AI chat failed" }, 502);
        const parsed = parseAssistantPayload(chatRes.rawText);
        reply = parsed.reply;
        citations = await finalizeChatCitations(
          supabase,
          userId,
          parsed.citations,
          {
            includeGeneral,
            usedWeb: Boolean(webBlock.trim()),
          },
          contextPack.retrievedCitations,
        );
      }

      const { data: asstRow, error: asstErr } = await supabase
        .from("my_ai_messages")
        .insert({
          user_id: userId,
          chat_id: chatId,
          role: "assistant",
          content: reply,
          citations,
        })
        .select("id")
        .single();

      if (asstErr || !asstRow) {
        return jsonResponse({ error: asstErr?.message ?? "Failed to save assistant message" }, 502);
      }

      await supabase.from("my_ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId).eq(
        "user_id",
        userId,
      );

      if (claimBootstrap && claimFocusBlock) {
        const { data: jCur, error: jgErr } = await supabase
          .from("journal_entries")
          .select("tags")
          .eq("id", journalEntryId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!jgErr && jCur) {
          const prevTags = Array.isArray(jCur.tags)
            ? (jCur.tags as string[]).filter((t): t is string => typeof t === "string" && t.length > 0)
            : [];
          const nextTags = [...new Set([...prevTags, "chat-journal", "artifact-claim"])].slice(0, 16);
          const { data: claimTitleRow } = await supabase
            .from("artifact_claims")
            .select("claim")
            .eq("id", claimBootstrap)
            .maybeSingle();
          const ct = typeof claimTitleRow?.claim === "string" ? claimTitleRow.claim.trim() : "";
          const titleSlice = ct ? claimResearchTitleFromClaim(ct) : "Artifact claim — chat";
          await supabase
            .from("journal_entries")
            .update({
              title: titleSlice,
              tags: nextTags,
              updated_at: new Date().toISOString(),
            })
            .eq("id", journalEntryId)
            .eq("user_id", userId);
        }
      }

      return jsonResponse({
        chat_id: chatId,
        assistant_message_id: asstRow.id as string,
        content: reply,
        citations,
      });
    }

    // --- Retry last assistant turn ---
    let message = typeof body.message === "string" ? body.message.trim() : "";
    let skipUserInsert = false;
    let chatId: string | null = typeof body.chat_id === "string" && body.chat_id.length ? body.chat_id : null;

    if (body.retry_last === true) {
      if (!chatId) return jsonResponse({ error: "chat_id is required for retry_last" }, 400);
      const { data: chatOwn, error: coErr } = await supabase
        .from("my_ai_chats")
        .select("id,user_id")
        .eq("id", chatId)
        .maybeSingle();
      if (coErr) return jsonResponse({ error: coErr.message }, 502);
      if (!chatOwn || chatOwn.user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

      const { data: lastMsgs, error: ltErr } = await supabase
        .from("my_ai_messages")
        .select("id,role,content,created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (ltErr) return jsonResponse({ error: ltErr.message }, 502);
      const desc = (lastMsgs ?? []) as { id: string; role: string; content: string }[];
      const last = desc[0];
      if (!last || last.role !== "assistant") {
        return jsonResponse({ error: "Nothing to retry — last message is not from the assistant" }, 400);
      }
      await supabase.from("my_ai_messages").delete().eq("id", last.id).eq("user_id", userId);

      let lastUser = "";
      for (let i = 1; i < desc.length; i++) {
        const row = desc[i];
        if (row.role === "user") {
          lastUser = row.content;
          break;
        }
      }
      if (!lastUser.trim()) return jsonResponse({ error: "No user message found to retry from" }, 400);
      message = lastUser.trim();
      skipUserInsert = true;
    }

    if (!message) {
      return jsonResponse({ error: "message is required" }, 400);
    }

    if (chatId) {
      const { data: existing, error: exErr } = await supabase
        .from("my_ai_chats")
        .select("id,user_id,journal_entry_id")
        .eq("id", chatId)
        .maybeSingle();
      if (exErr) return jsonResponse({ error: exErr.message }, 502);
      if (!existing || existing.user_id !== userId) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      if (mode === "journal" && journalEntryId) {
        if (existing.journal_entry_id && existing.journal_entry_id !== journalEntryId) {
          return jsonResponse({ error: "journal_entry_id does not match this chat" }, 403);
        }
        if (!existing.journal_entry_id) {
          const { error: linkErr } = await supabase
            .from("my_ai_chats")
            .update({ journal_entry_id: journalEntryId })
            .eq("id", chatId)
            .eq("user_id", userId);
          if (linkErr) return jsonResponse({ error: linkErr.message }, 502);
        }
        await supabase
          .from("journal_entries")
          .update({ entry_kind: "chat" })
          .eq("id", journalEntryId)
          .eq("user_id", userId);
      }
    } else {
      const insertRow: { user_id: string; journal_entry_id?: string } = { user_id: userId };
      if (mode === "journal" && journalEntryId) {
        const { data: je, error: jeErr } = await supabase
          .from("journal_entries")
          .select("id,user_id,entry_kind")
          .eq("id", journalEntryId)
          .maybeSingle();
        if (jeErr) return jsonResponse({ error: jeErr.message }, 502);
        if (!je || je.user_id !== userId || je.entry_kind !== "chat") {
          return jsonResponse({ error: "Invalid journal_entry_id for journal chat" }, 400);
        }
        insertRow.journal_entry_id = journalEntryId;
      }
      const { data: created, error: cErr } = await supabase
        .from("my_ai_chats")
        .insert(insertRow)
        .select("id")
        .single();
      if (cErr || !created) {
        return jsonResponse({ error: cErr?.message ?? "Failed to create chat" }, 502);
      }
      chatId = created.id as string;
    }

    const editUserId =
      typeof body.edit_user_message_id === "string" && /^[0-9a-f-]{36}$/i.test(body.edit_user_message_id)
        ? body.edit_user_message_id
        : null;
    if (editUserId && message) {
      const { data: editRow, error: editErr } = await supabase
        .from("my_ai_messages")
        .select("id, role, created_at")
        .eq("id", editUserId)
        .eq("chat_id", chatId)
        .eq("user_id", userId)
        .maybeSingle();
      if (editErr) return jsonResponse({ error: editErr.message }, 502);
      if (!editRow || editRow.role !== "user") {
        return jsonResponse({ error: "edit_user_message_id must be a user message in this chat" }, 400);
      }
      const pivotAt = editRow.created_at as string;
      const { data: laterRows } = await supabase
        .from("my_ai_messages")
        .select("id")
        .eq("chat_id", chatId)
        .eq("user_id", userId)
        .gt("created_at", pivotAt);
      const laterIds = (laterRows ?? []).map((r) => r.id as string);
      if (laterIds.length) {
        await supabase.from("my_ai_messages").delete().in("id", laterIds).eq("user_id", userId);
      }
      await supabase
        .from("my_ai_messages")
        .update({ content: message })
        .eq("id", editUserId)
        .eq("user_id", userId);
      skipUserInsert = true;
    }

    if (!skipUserInsert) {
      const { error: insUserErr } = await supabase.from("my_ai_messages").insert({
        user_id: userId,
        chat_id: chatId,
        role: "user",
        content: message,
        citations: [],
      });
      if (insUserErr) return jsonResponse({ error: insUserErr.message }, 502);
    }

    const { data: chatMeta } = await supabase
      .from("my_ai_chats")
      .select("journal_entry_id")
      .eq("id", chatId)
      .maybeSingle();
    const linkedJournalId = (chatMeta?.journal_entry_id as string | null | undefined) ?? null;
    const journalMode = !!linkedJournalId;

    const excludeJournal = journalMode && linkedJournalId ? linkedJournalId : null;

    const claimPackIdRaw = typeof body.artifact_claim_id === "string" ? body.artifact_claim_id.trim() : "";
    const claimPackId = /^[0-9a-f-]{36}$/i.test(claimPackIdRaw) ? claimPackIdRaw : "";
    const hqPackIdRaw = typeof body.hard_question_id === "string" ? body.hard_question_id.trim() : "";
    const hqPackId = /^[0-9a-f-]{36}$/i.test(hqPackIdRaw) ? hqPackIdRaw : "";

    const researchScope =
      body.research_scope === "library" || body.research_scope === "outside" || body.research_scope === "web"
        ? body.research_scope
        : null;
    const librarySearch = researchScope === "library";

    const chatUseWeb = body.claim_research?.use_web === true || researchScope === "web";

    let resolvedDepth = resolveResponseDepth(parseResponseDepthSetting(body.response_depth), message);
    if ((chatUseWeb && claimPackId && resolvedDepth !== "deep") || researchScope === "outside" || researchScope === "web") {
      resolvedDepth = "deep";
    }

    const companionMode = parseCompanionMode(body.companion_mode, journalMode);
    const effectiveCompanionMode: MyAiCompanionMode =
      researchScope === "library" ? "inward" : companionMode;
    if (companionMode === "chatgpt" && parseResponseDepthSetting(body.response_depth) === "auto") {
      resolvedDepth = "deep";
    }

    let includeGeneral = journalMode
      ? body.include_general_knowledge === true
      : body.include_general_knowledge !== false;
    if (researchScope === "library") {
      includeGeneral = false;
    } else if (researchScope === "outside" || researchScope === "web") {
      includeGeneral = true;
    } else if (companionMode === "chatgpt") {
      includeGeneral = true;
    }

    const useStream = body.stream !== false && !chatUseWeb && !claimPackId;

    if (useStream) {
      return createStreamingChatResponse({
        supabase,
        userId,
        chatId: chatId!,
        journalMode,
        includeGeneral,
        message,
        resolvedDepth,
        skipUserInsert,
        excludeJournal,
        librarySearch,
        companionMode: effectiveCompanionMode,
        corsHeaders,
      });
    }

    const contextPack = await buildFrameworkRetrievalContext(
      supabase,
      userId,
      chatId!,
      message,
      excludeJournal,
      { librarySearch },
    );
    const partnerAppendix = await buildPartnerWalkingAppendixForAi(supabase, userId);
    const researchPackBlock = claimPackId
      ? await loadClaimResearchPackBlock(supabase, userId, claimPackId)
      : hqPackId
      ? await loadHardQuestionResearchPackBlock(supabase, userId, hqPackId)
      : "";
    const webBlock = chatUseWeb && claimPackId
      ? await loadClaimChatWebBlock(supabase, userId, claimPackId, message)
      : "";

    const generated = await generateClaimChatReply(
      journalMode,
      includeGeneral,
      partnerAppendix,
      contextPack.contextBlock,
      researchPackBlock,
      webBlock,
      message,
      resolvedDepth,
      chatUseWeb,
      claimPackId,
      effectiveCompanionMode,
    );
    if ("error" in generated) return jsonResponse({ error: generated.error }, 502);
    const { reply, citations: modelCitations, ranked } = generated;
    const citations = await finalizeChatCitations(
      supabase,
      userId,
      modelCitations,
      { includeGeneral, usedWeb: chatUseWeb },
      contextPack.retrievedCitations,
    );

    const { data: asstRow, error: asstErr } = await supabase
      .from("my_ai_messages")
      .insert({
        user_id: userId,
        chat_id: chatId,
        role: "assistant",
        content: reply,
        citations,
      })
      .select("id")
      .single();

    if (asstErr || !asstRow) {
      return jsonResponse({ error: asstErr?.message ?? "Failed to save assistant message" }, 502);
    }

    // Persist candidates (winner + losers) for future rubric tuning. Fire-and-forget.
    try {
      if (ranked && !("error" in ranked)) {
        const candRows = ranked.candidates.map((c) => ({
        user_id: userId,
        chat_id: chatId,
        winning_message_id: asstRow.id as string,
        candidate_index: c.cand.index,
        temperature: c.cand.temperature,
        content: c.cand.reply,
        citations: c.cand.citations,
        scores: c.score
          ? {
            specificity: c.score.specificity,
            continuity: c.score.continuity,
            non_genericness: c.score.non_genericness,
            voice_match: c.score.voice_match,
            emotional_resonance: c.score.emotional_resonance,
          }
          : {},
        total_score: c.score?.total ?? null,
        was_winner: c.isWinner,
        judge_rationale: c.score?.rationale ?? null,
      }));
        if (candRows.length > 0) {
          await supabase.from("my_ai_message_candidates").insert(candRows);
        }
      }
    } catch (_e) {
      /* non-fatal */
    }

    const { data: chatRow } = await supabase
      .from("my_ai_chats")
      .select("title,journal_entry_id")
      .eq("id", chatId)
      .maybeSingle();

    const patch: { updated_at: string; title?: string } = {
      updated_at: new Date().toISOString(),
    };
    let titleOut =
      typeof chatRow?.title === "string" && chatRow.title.trim() ? chatRow.title.trim() : null;

    if (!titleOut && !skipUserInsert) {
      titleOut = titleFromFirstMessage(message);
      patch.title = titleOut;
    }

    await supabase.from("my_ai_chats").update(patch).eq("id", chatId).eq("user_id", userId);

    const journalEntryIdLinked = (chatRow?.journal_entry_id as string | null) ?? null;
    if (titleOut && journalEntryIdLinked) {
      const { data: journalEntry } = await supabase
        .from("journal_entries")
        .select("title")
        .eq("id", journalEntryIdLinked)
        .eq("user_id", userId)
        .maybeSingle();
      if (!journalEntry?.title?.trim()) {
        await supabase
          .from("journal_entries")
          .update({ title: titleOut, updated_at: new Date().toISOString() })
          .eq("id", journalEntryIdLinked)
          .eq("user_id", userId);
      }
    }

    return jsonResponse({
      chat_id: chatId,
      assistant_message_id: asstRow.id as string,
      content: reply,
      citations,
      title: titleOut,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  } finally {
    clearAiUsageContext();
  }
});
