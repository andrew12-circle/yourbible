/**
 * Shared enrichment: Wikipedia → DuckDuckGo → Gemini bio for public figures / named topics.
 * Used by framework-enrich-influence and framework-enrich-entity.
 */

export const PUBLIC_FIGURE_GEMINI_MODEL = "gemini-2.5-flash";

export type EnrichSource = "wikipedia" | "duckduckgo" | "llm";

export type PublicFigureEnrichResult = {
  avatar_url?: string;
  bio?: string;
  source_url?: string;
  source?: EnrichSource;
};

type WikiSummary = {
  type?: string;
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
};

type DdgJson = {
  Image?: string;
  AbstractText?: string;
  AbstractURL?: string;
};

export function trimStr(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

export function hasUsefulEnrichContent(r: PublicFigureEnrichResult): boolean {
  return Boolean(trimStr(r.bio) || trimStr(r.avatar_url));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function tryWikipedia(name: string): Promise<PublicFigureEnrichResult | null> {
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
  const out: PublicFigureEnrichResult = { source: "wikipedia" };
  if (thumb) out.avatar_url = thumb;
  if (extract) out.bio = extract;
  if (page) out.source_url = page;
  return hasUsefulEnrichContent(out) ? out : null;
}

export async function tryDuckDuckGo(
  name: string,
  scope?: string,
  hint?: string,
): Promise<PublicFigureEnrichResult | null> {
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
  const out: PublicFigureEnrichResult = { source: "duckduckgo" };
  if (image) out.avatar_url = image;
  if (abstract) out.bio = abstract;
  if (absUrl) out.source_url = absUrl;
  return hasUsefulEnrichContent(out) ? out : null;
}

export async function tryGeminiBio(
  name: string,
  scope?: string,
  hint?: string,
): Promise<{ result: PublicFigureEnrichResult | null; fault?: string }> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { result: null };
  const context = [scope && `Scope/category: ${scope}`, hint && `Context: ${hint}`]
    .filter(Boolean)
    .join("\n");
  const prompt = `Write one short factual paragraph (max 90 words) about who or what "${name}" is in a religious/theological or general public figure sense. ${context ? `\n${context}` : ""}

Rules:
- Only state widely verifiable facts; no speculation.
- If you do not know with high confidence, respond with exactly: I_DONT_KNOW
- No markdown, no bullet points, plain prose only.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${PUBLIC_FIGURE_GEMINI_MODEL}:generateContent`,
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

export async function enrichPublicFigure(
  name: string,
  scope?: string,
  hint?: string,
): Promise<{ result: PublicFigureEnrichResult; llmFault?: string }> {
  const n = name.trim();
  if (!n) return { result: {} };

  const wiki = await tryWikipedia(n).catch(() => null);
  if (wiki && hasUsefulEnrichContent(wiki)) return { result: wiki };

  const ddg = await tryDuckDuckGo(n, scope, hint).catch(() => null);
  if (ddg && hasUsefulEnrichContent(ddg)) return { result: ddg };

  const { result: llm, fault } = await tryGeminiBio(n, scope, hint).catch((e) => ({
    result: null as PublicFigureEnrichResult | null,
    fault: String(e),
  }));
  if (llm && hasUsefulEnrichContent(llm)) return { result: llm };

  return { result: {}, llmFault: fault };
}
