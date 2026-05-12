/**
 * Fetches public bio + image for an influence name (Wikipedia → DuckDuckGo → optional Gemini).
 * Does not write to the database; the client merges results into belief_sources rows.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EnrichSource = "wikipedia" | "duckduckgo" | "llm";

type EnrichResult = {
  avatar_url?: string;
  bio?: string;
  source_url?: string;
  source?: EnrichSource;
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

function trimStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

function hasUsefulContent(r: EnrichResult): boolean {
  return Boolean(trimStr(r.bio) || trimStr(r.avatar_url));
}

async function tryWikipedia(name: string): Promise<EnrichResult | null> {
  const title = name.trim();
  if (!title) return null;
  const path = encodeURIComponent(title.replace(/ /g, "_"));
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${path}`, {
    headers: {
      "User-Agent": "YourBibleFramework/1.0 (contact: app)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as WikiSummary;
  if (json.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") return null;
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
      "User-Agent": "YourBibleFramework/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as DdgJson;
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

async function tryGeminiBio(name: string, scope?: string, hint?: string): Promise<EnrichResult | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  const context = [scope && `Scope/category: ${scope}`, hint && `Hint: ${hint}`].filter(Boolean).join("\n");
  const prompt = `Write one short factual paragraph (max 90 words) about who or what "${name}" is in a religious/theological or general public figure sense. ${context ? `\n${context}` : ""}

Rules:
- Only state widely verifiable facts; no speculation.
- If you do not know with high confidence, respond with exactly: I_DONT_KNOW
- No markdown, no bullet points, plain prose only.`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = trimStr(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(" ") ?? "");
  if (!text || /^I_DONT_KNOW$/i.test(text.trim())) return null;
  return { bio: text, source: "llm" };
}

async function enrich(name: string, scope?: string, hint?: string): Promise<EnrichResult> {
  const n = name.trim();
  if (!n) return {};

  const wiki = await tryWikipedia(n).catch(() => null);
  if (wiki && hasUsefulContent(wiki)) return wiki;

  const ddg = await tryDuckDuckGo(n, scope, hint).catch(() => null);
  if (ddg && hasUsefulContent(ddg)) return ddg;

  const llm = await tryGeminiBio(n, scope, hint).catch(() => null);
  if (llm && hasUsefulContent(llm)) return llm;

  return {};
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { name?: string; scope?: string; hint?: string };
    const name = typeof body.name === "string" ? body.name : "";
    const scope = typeof body.scope === "string" ? body.scope : undefined;
    const hint = typeof body.hint === "string" ? body.hint : undefined;

    if (!name.trim()) {
      return new Response(JSON.stringify({ error: "name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await enrich(name, scope, hint);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
