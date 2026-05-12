/**
 * Enriches grouped "influences" (belief_sources rows) from Wikipedia → DuckDuckGo → Gemini.
 * Callers send source row UUIDs; the function verifies ownership via RLS + JWT, then persists
 * bio / avatar_url / metadata on those rows.
 */
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const GEMINI_MODEL = "gemini-2.5-flash";
const BETWEEN_GROUP_MS = 550;

type EnrichSource = "wikipedia" | "duckduckgo" | "llm";

type EnrichResult = {
  avatar_url?: string;
  bio?: string;
  source_url?: string;
  source?: EnrichSource;
};

type InfluenceMeta = {
  bio?: string;
  source_url?: string;
  enrichment_source?: EnrichSource;
  enriched_at?: string;
};

type WikiSummary = {
  type?: string;
  title?: string;
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
};

type DdgJson = {
  Image?: string;
  AbstractText?: string;
  AbstractURL?: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function trimStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

function parseInfluenceMeta(raw: unknown): InfluenceMeta {
  if (!isRecord(raw)) return {};
  const bio = trimStr(raw.bio);
  const source_url = trimStr(raw.source_url);
  const enriched_at = trimStr(raw.enriched_at);
  const enrichment_source =
    raw.enrichment_source === "wikipedia" ||
    raw.enrichment_source === "duckduckgo" ||
    raw.enrichment_source === "llm"
      ? raw.enrichment_source
      : undefined;
  return {
    ...(bio ? { bio } : {}),
    ...(source_url ? { source_url } : {}),
    ...(enrichment_source ? { enrichment_source } : {}),
    ...(enriched_at ? { enriched_at } : {}),
  };
}

function hasUsefulContent(r: EnrichResult): boolean {
  return Boolean(trimStr(r.bio) || trimStr(r.avatar_url));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryWikipedia(name: string): Promise<EnrichResult | null> {
  const title = name.trim();
  if (!title) return null;
  const path = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${path}`, {
    headers: {
      "User-Agent": "YourBible/1.0 (+https://github.com/yourbible; framework enrich)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as WikiSummary | null;
  if (!json) return null;
  if (json.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") return null;
  if (json.type === "disambiguation") return null;
  const extract = trimStr(json.extract);
  const thumb = trimStr(json.thumbnail?.source);
  const page = trimStr(json.content_urls?.desktop?.page);
  if (!extract && !thumb) return null;
  const out: EnrichResult = { source: "wikipedia" };
  if (thumb) out.avatar_url = thumb;
  if (extract) out.bio = extract;
  if (page) out.source_url = page;
  return hasUsefulContent(out) ? out : null;
}

async function tryDuckDuckGo(name: string, scope?: string, hint?: string): Promise<EnrichResult | null> {
  const q = [name.trim(), scope?.trim(), hint?.trim()].filter(Boolean).join(" ");
  if (!q) return null;
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "YourBible/1.0 (+https://github.com/yourbible; framework enrich)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as DdgJson | null;
  if (!json) return null;
  const abstract = trimStr(json.AbstractText);
  const image = trimStr(json.Image);
  const absUrl = trimStr(json.AbstractURL);
  if (!abstract && !image) return null;
  const out: EnrichResult = { source: "duckduckgo" };
  if (image) out.avatar_url = image;
  if (abstract) out.bio = abstract;
  if (absUrl) out.source_url = absUrl;
  return hasUsefulContent(out) ? out : null;
}

async function tryGeminiBio(
  name: string,
  scope?: string,
  hint?: string,
): Promise<{ result: EnrichResult | null; fault?: string }> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { result: null };
  const context = [scope && `Scope/category: ${scope}`, hint && `Related belief topics (user's labels only): ${hint}`]
    .filter(Boolean)
    .join("\n");
  const prompt = `Write one short factual paragraph (max 90 words) about who or what "${name}" is in a religious/theological or general public figure sense. ${context ? `\n${context}` : ""}

Rules:
- Only state widely verifiable facts; no speculation.
- If you do not know with high confidence, respond with exactly: I_DONT_KNOW
- No markdown, no bullet points, plain prose only.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      }),
    },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return { result: null, fault: `Gemini HTTP ${res.status}: ${errText.slice(0, 280)}` };
  }
  const data = (await res.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  const text = trimStr(
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(" ") ?? "",
  );
  if (!text || /^I_DONT_KNOW$/i.test(text.trim())) return { result: null };
  return { result: { bio: text, source: "llm" } };
}

async function enrich(name: string, scope?: string, hint?: string): Promise<{
  result: EnrichResult;
  llmFault?: string;
}> {
  const n = name.trim();
  if (!n) return { result: {} };

  const wiki = await tryWikipedia(n).catch(() => null);
  if (wiki && hasUsefulContent(wiki)) return { result: wiki };

  const ddg = await tryDuckDuckGo(n, scope, hint).catch(() => null);
  if (ddg && hasUsefulContent(ddg)) return { result: ddg };

  const { result: llm, fault } = await tryGeminiBio(n, scope, hint).catch((e) => ({
    result: null as EnrichResult | null,
    fault: String(e),
  }));
  if (llm && hasUsefulContent(llm)) return { result: llm };

  return { result: {}, llmFault: fault };
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

async function enrichOneGroup(
  supabase: SupabaseClient,
  userId: string,
  sourceRowIds: string[],
): Promise<{
  source_row_ids: string[];
  ok: boolean;
  saved?: boolean;
  error?: string;
  detail?: string;
  bio?: string;
  avatar_url?: string;
  source_url?: string;
  source?: EnrichSource;
}> {
  const ids = [...new Set(sourceRowIds)].filter(Boolean);
  if (ids.length === 0) {
    return { source_row_ids: [], ok: false, error: "source_row_ids (or ids) is required" };
  }

  const { data: rows, error: qErr } = await supabase
    .from("belief_sources")
    .select("id,belief_id,label,source_type,avatar_url,metadata")
    .in("id", ids)
    .eq("user_id", userId);

  if (qErr) {
    return { source_row_ids: ids, ok: false, error: qErr.message };
  }
  const list = (rows ?? []) as Array<{
    id: string;
    belief_id: string;
    label: string;
    source_type: string;
    avatar_url: string | null;
    metadata: unknown;
  }>;
  if (list.length === 0) {
    return { source_row_ids: ids, ok: false, error: "Influence rows not found or not accessible." };
  }
  if (list.length !== ids.length) {
    return { source_row_ids: ids, ok: false, error: "Some influence ids were not found for this account." };
  }

  const label = list[0].label.trim();
  const sourceType = list[0].source_type.trim();
  const sameGroup = list.every(
    (r) => r.label.trim() === label && r.source_type.trim() === sourceType,
  );
  if (!sameGroup) {
    return {
      source_row_ids: ids,
      ok: false,
      error: "All source_row_ids must belong to the same influence (matching label and type).",
    };
  }

  const beliefIds = [...new Set(list.map((r) => r.belief_id))];
  let topicHint = "";
  if (beliefIds.length > 0) {
    const { data: topics, error: tErr } = await supabase
      .from("belief_nodes")
      .select("topic")
      .eq("user_id", userId)
      .in("id", beliefIds);
    if (!tErr && topics?.length) {
      topicHint = (topics as { topic: string }[])
        .map((t) => t.topic.trim())
        .filter(Boolean)
        .slice(0, 12)
        .join("; ");
    }
  }

  const { result: payload, llmFault } = await enrich(label, sourceType, topicHint || undefined);

  if (!hasUsefulContent(payload)) {
    return {
      source_row_ids: ids,
      ok: true,
      saved: false,
      detail: llmFault ?? "No public profile found from Wikipedia, DuckDuckGo, or the configured LLM.",
    };
  }

  const firstMeta = parseInfluenceMeta(list[0].metadata);
  const newAvatar =
    trimStr(payload.avatar_url) ||
    list.map((r) => trimStr(r.avatar_url)).find(Boolean) ||
    undefined;
  const newBio = trimStr(payload.bio) || firstMeta.bio;
  const newSourceUrl = trimStr(payload.source_url) || firstMeta.source_url;
  const enrichment_source = payload.source ?? firstMeta.enrichment_source;
  const nextMeta: Record<string, unknown> = {
    ...firstMeta,
    ...(newBio ? { bio: newBio } : {}),
    ...(newSourceUrl ? { source_url: newSourceUrl } : {}),
    ...(enrichment_source ? { enrichment_source } : {}),
    enriched_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("belief_sources")
    .update({
      avatar_url: newAvatar ?? null,
      metadata: nextMeta,
    })
    .in("id", ids)
    .eq("user_id", userId);

  if (upErr) {
    return { source_row_ids: ids, ok: false, error: upErr.message };
  }

  return {
    source_row_ids: ids,
    ok: true,
    saved: true,
    bio: trimStr(payload.bio),
    avatar_url: trimStr(payload.avatar_url),
    source_url: trimStr(payload.source_url),
    source: payload.source,
  };
}

/** Legacy: enrich by name only (no DB ids) — does not persist; client may merge. */
async function enrichLegacyName(
  name: string,
  scope?: string,
  hint?: string,
): Promise<{ ok: boolean; error?: string; llmFault?: string } & EnrichResult> {
  const { result, llmFault } = await enrich(name, scope, hint);
  if (!hasUsefulContent(result)) {
    return {
      ok: false,
      error: llmFault ?? "No public profile found from Wikipedia, DuckDuckGo, or the configured LLM.",
    };
  }
  return { ok: true, ...result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ ok: false, error: "Supabase environment is not configured." }, 500);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    const uid = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const groupsRaw = body.groups;
    if (Array.isArray(groupsRaw) && groupsRaw.length > 0) {
      const results: Awaited<ReturnType<typeof enrichOneGroup>>[] = [];
      for (let i = 0; i < groupsRaw.length; i += 1) {
        const g = groupsRaw[i];
        const ids = isRecord(g) ? normalizeIds(g.source_row_ids) : [];
        if (i > 0) await sleep(BETWEEN_GROUP_MS);
        results.push(await enrichOneGroup(supabase, uid, ids));
      }
      return jsonResponse({ ok: true, results });
    }

    let ids = normalizeIds(body.source_row_ids);
    if (ids.length === 0) ids = normalizeIds(body.ids);
    if (ids.length === 0 && typeof body.influence_id === "string" && body.influence_id.trim()) {
      ids = [body.influence_id.trim()];
    }

    if (ids.length > 0) {
      const one = await enrichOneGroup(supabase, uid, ids);
      if (!one.ok) {
        return jsonResponse({ ok: false, error: one.error ?? "Enrichment failed." }, 200);
      }
      return jsonResponse({
        ok: true,
        saved: one.saved,
        detail: one.saved ? undefined : one.detail,
        source_row_ids: one.source_row_ids,
        bio: one.bio,
        avatar_url: one.avatar_url,
        source_url: one.source_url,
        source: one.source,
      });
    }

    const name = typeof body.name === "string" ? body.name : "";
    const scope = typeof body.scope === "string" ? body.scope : undefined;
    const hint = typeof body.hint === "string" ? body.hint : undefined;
    if (!name.trim()) {
      return jsonResponse(
        { ok: false, error: "Send source_row_ids, ids, influence_id, or legacy name." },
        400,
      );
    }

    const legacy = await enrichLegacyName(name, scope, hint);
    if (!legacy.ok) {
      return jsonResponse({ ok: false, error: legacy.error }, 200);
    }
    return jsonResponse({
      ok: true,
      saved: false,
      bio: legacy.bio,
      avatar_url: legacy.avatar_url,
      source_url: legacy.source_url,
      source: legacy.source,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
