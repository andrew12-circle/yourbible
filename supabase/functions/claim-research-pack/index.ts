/**
 * claim-research-pack — structured research for a single artifact claim.
 *
 * pack_type:
 * - "standard" — multi-lens research pack (scripture_context, historical_theology, …)
 * - "validation" — Bible alignment, historical context, three independent voices (optional web)
 *
 * Deploy: `supabase functions deploy claim-research-pack --project-ref <ref>`
 * Required secrets: GEMINI_API_KEY, SUPABASE_URL/ANON (auto), API_BIBLE_KEY via bible-passage
 * Optional live web: WEB_SEARCH_PROVIDER=brave|serpapi + BRAVE_SEARCH_API_KEY or SERPAPI_API_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  DEFAULT_LENS_IDS,
  VALIDATION_LENS_IDS,
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

    const claimIdRaw = typeof bodyRaw.artifact_claim_id === "string" ? bodyRaw.artifact_claim_id.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(claimIdRaw)) {
      return researchPackJsonResponse({ error: "artifact_claim_id (UUID) is required" }, 400);
    }

    const claimResearch = isRecord(bodyRaw.claim_research) ? bodyRaw.claim_research : null;
    const useWeb = claimResearch?.use_web !== false;
    const packTypeRaw = typeof bodyRaw.pack_type === "string" ? bodyRaw.pack_type.trim().toLowerCase() : "";
    const packType: PackType = packTypeRaw === "validation" ? "validation" : "standard";
    const userQuestion = typeof bodyRaw.user_question === "string" ? bodyRaw.user_question.trim().slice(0, 2000) : "";

    const lensesIn: unknown = bodyRaw.lenses;
    let lensList: LensId[] = packType === "validation" ? [...VALIDATION_LENS_IDS] : [...DEFAULT_LENS_IDS];
    if (Array.isArray(lensesIn)) {
      const picked = lensesIn
        .filter((x): x is string => typeof x === "string" && isLensId(x.trim(), packType))
        .map((x) => x.trim() as LensId);
      if (picked.length) lensList = [...new Set(picked)];
    }

    const { data: claimRow, error: clErr } = await supabase
      .from("artifact_claims")
      .select(
        "id, artifact_id, claim, tone, doctrine_tags, bias_flags, scripture_supports, scripture_challenges, user_id, chapter_start_seconds",
      )
      .eq("id", claimIdRaw)
      .maybeSingle();
    if (clErr) return researchPackJsonResponse({ error: clErr.message }, 502);
    if (!claimRow || claimRow.user_id !== userId) {
      return researchPackJsonResponse({ error: "Claim not found" }, 404);
    }

    const { data: artRow, error: artErr } = await supabase
      .from("artifacts")
      .select("id, title, kind, url, raw_text, user_id, metadata")
      .eq("id", claimRow.artifact_id as string)
      .maybeSingle();
    if (artErr) return researchPackJsonResponse({ error: artErr.message }, 502);
    if (!artRow || artRow.user_id !== userId) {
      return researchPackJsonResponse({ error: "Artifact not found for claim" }, 404);
    }

    const claimText = typeof claimRow.claim === "string" ? claimRow.claim : "";
    const rawText = typeof artRow.raw_text === "string" ? artRow.raw_text : "";
    const transcriptExcerpt = rawText ? rawText.replace(/\s+/g, " ").trim().slice(0, 2400) : "";
    const artifactUrl = typeof artRow.url === "string" ? artRow.url.trim() : "";

    const supList = Array.isArray(claimRow.scripture_supports) ? claimRow.scripture_supports as unknown[] : [];
    const chList = Array.isArray(claimRow.scripture_challenges) ? claimRow.scripture_challenges as unknown[] : [];
    const refStrings: string[] = [];
    const pushRef = (r: string) => {
      const t = r.trim();
      if (t && !refStrings.includes(t)) refStrings.push(t);
    };
    for (const row of supList) {
      if (isRecord(row) && typeof row.ref === "string") pushRef(row.ref);
    }
    for (const row of chList) {
      if (isRecord(row) && typeof row.ref === "string") pushRef(row.ref);
    }
    for (const guess of extractRefsFromText(claimText, 8)) pushRef(guess);

    const contextLines = [
      `artifact_title: ${typeof artRow.title === "string" ? artRow.title : ""}`,
      `artifact_kind: ${typeof artRow.kind === "string" ? artRow.kind : ""}`,
      artifactUrl ? `source_artifact_url: ${artifactUrl}` : "",
      `tone: ${typeof claimRow.tone === "string" ? claimRow.tone : ""}`,
      `doctrine_tags: ${JSON.stringify(claimRow.doctrine_tags ?? [])}`,
      `bias_flags: ${JSON.stringify(claimRow.bias_flags ?? [])}`,
      `scripture_supports: ${JSON.stringify(claimRow.scripture_supports ?? [])}`,
      `scripture_challenges: ${JSON.stringify(claimRow.scripture_challenges ?? [])}`,
      `transcript_excerpt (truncated):\n${transcriptExcerpt || "(none)"}`,
    ].filter(Boolean);

    const webSearchQuery = `${claimText.slice(0, 220)} theology interpretation Christian`;

    const result = await generateResearchPack({
      supabaseUrl: SUPABASE_URL,
      anonKey: SUPABASE_ANON,
      geminiApiKey: GEMINI_API_KEY,
      packType,
      useWeb,
      userQuestion,
      lensList,
      researchText: claimText,
      contextLines,
      refStrings,
      webSearchQuery,
    });

    if (!result.ok) {
      return researchPackJsonResponse({ error: result.error }, result.status);
    }

    return researchPackJsonResponse(result.data);
  } catch (e) {
    console.error("claim-research-pack error:", e);
    return researchPackJsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
