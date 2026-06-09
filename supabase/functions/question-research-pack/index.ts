/**
 * question-research-pack — multi-lens research for framework hard questions.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  DEFAULT_LENS_IDS,
  extractRefsFromText,
  generateResearchPack,
  isLensId,
  isRecord,
  researchPackCorsHeaders,
  researchPackJsonResponse,
  type LensId,
  type PackType,
} from "../_shared/researchPackCore.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: researchPackCorsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return researchPackJsonResponse({ error: "Server misconfigured (Supabase env)." }, 500);
    }
    if (!GEMINI_API_KEY) {
      return researchPackJsonResponse({ error: "GEMINI_API_KEY is not configured." }, 502);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return researchPackJsonResponse({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const bodyRaw: unknown = await req.json().catch(() => null);
    if (!isRecord(bodyRaw)) return researchPackJsonResponse({ error: "Invalid JSON body" }, 400);

    const questionIdRaw = typeof bodyRaw.hard_question_id === "string" ? bodyRaw.hard_question_id.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(questionIdRaw)) {
      return researchPackJsonResponse({ error: "hard_question_id (UUID) is required" }, 400);
    }

    const claimResearch = isRecord(bodyRaw.claim_research) ? bodyRaw.claim_research : null;
    const useWeb = claimResearch?.use_web === true;
    const packTypeRaw = typeof bodyRaw.pack_type === "string" ? bodyRaw.pack_type.trim().toLowerCase() : "";
    const packType: PackType = packTypeRaw === "validation" ? "validation" : "standard";
    const userQuestion = typeof bodyRaw.user_question === "string" ? bodyRaw.user_question.trim().slice(0, 2000) : "";

    const lensesIn: unknown = bodyRaw.lenses;
    let lensList: LensId[] = [...DEFAULT_LENS_IDS];
    if (Array.isArray(lensesIn)) {
      const picked = lensesIn
        .filter((x): x is string => typeof x === "string" && isLensId(x.trim(), packType))
        .map((x) => x.trim() as LensId);
      if (picked.length) lensList = [...new Set(picked)];
    }

    const { data: qRow, error: qErr } = await supabase
      .from("framework_hard_questions")
      .select(
        "id, title, framing, why_it_matters, current_thinking, notes, tags, scripture_refs, user_id",
      )
      .eq("id", questionIdRaw)
      .maybeSingle();
    if (qErr) return researchPackJsonResponse({ error: qErr.message }, 502);
    if (!qRow || qRow.user_id !== userId) {
      return researchPackJsonResponse({ error: "Hard question not found" }, 404);
    }

    const { data: sources } = await supabase
      .from("hard_question_sources")
      .select("label, snippet, url, kind, artifact_id")
      .eq("hard_question_id", questionIdRaw)
      .order("created_at", { ascending: true })
      .limit(20);

    const title = typeof qRow.title === "string" ? qRow.title : "";
    const framing = typeof qRow.framing === "string" ? qRow.framing : "";
    const researchText = [title, framing].filter(Boolean).join("\n\n");

    const refStrings: string[] = [];
    const pushRef = (r: string) => {
      const t = r.trim();
      if (t && !refStrings.includes(t)) refStrings.push(t);
    };
    const refsRaw = qRow.scripture_refs;
    if (Array.isArray(refsRaw)) {
      for (const row of refsRaw) {
        if (isRecord(row) && typeof row.ref === "string") pushRef(row.ref);
      }
    }
    for (const guess of extractRefsFromText(`${title} ${framing}`, 8)) pushRef(guess);

    const sourceLines: string[] = [];
    if (Array.isArray(sources) && sources.length) {
      sourceLines.push("## User-gathered sources");
      for (const s of sources) {
        const label = typeof s.label === "string" ? s.label : "Source";
        const snippet = typeof s.snippet === "string" ? s.snippet.trim().slice(0, 800) : "";
        const url = typeof s.url === "string" ? s.url : "";
        sourceLines.push(`- **${label}**${url ? ` (${url})` : ""}${snippet ? `\n  ${snippet}` : ""}`);
      }
    }

    const contextLines = [
      framing ? `framing:\n${framing}` : "",
      typeof qRow.why_it_matters === "string" && qRow.why_it_matters.trim()
        ? `why_it_matters:\n${qRow.why_it_matters.trim()}`
        : "",
      typeof qRow.current_thinking === "string" && qRow.current_thinking.trim()
        ? `current_thinking:\n${qRow.current_thinking.trim()}`
        : "",
      typeof qRow.notes === "string" && qRow.notes.trim()
        ? `research_notes:\n${qRow.notes.trim().slice(0, 3000)}`
        : "",
      Array.isArray(qRow.tags) && qRow.tags.length ? `tags: ${JSON.stringify(qRow.tags)}` : "",
      ...sourceLines,
    ].filter(Boolean);

    const webSearchQuery = [title, framing].filter(Boolean).join(" ").slice(0, 280) +
      " theology Christian perspective";

    const result = await generateResearchPack({
      supabaseUrl: SUPABASE_URL,
      anonKey: SUPABASE_ANON,
      geminiApiKey: GEMINI_API_KEY,
      packType,
      useWeb,
      userQuestion,
      lensList,
      researchText,
      contextLines,
      refStrings,
      webSearchQuery,
    });

    if (!result.ok) {
      return researchPackJsonResponse({ error: result.error }, result.status);
    }

    return researchPackJsonResponse(result.data);
  } catch (e) {
    console.error("question-research-pack error:", e);
    return researchPackJsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
