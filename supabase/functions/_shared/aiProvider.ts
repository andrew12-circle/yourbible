/** Shared AI provider helpers for edge functions (chat + query embeddings). */

export type AiProvider = "openai" | "gemini";

export const EMBEDDING_DIMS = 768;

const GEMINI_CHAT_MODEL = "gemini-2.5-flash";
const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.5";

export type ChatCallResult = { rawText: string; ok: boolean; err?: string };

export function resolveAiProvider(): AiProvider {
  const explicit = Deno.env.get("AI_PROVIDER")?.trim().toLowerCase();
  if (explicit === "openai" || explicit === "gemini") return explicit;
  return "gemini";
}

function geminiApiKey(): string {
  return Deno.env.get("GEMINI_API_KEY")?.trim() ?? "";
}

function openAiApiKey(): string {
  return Deno.env.get("OPENAI_API_KEY")?.trim() ?? "";
}

/** True when OpenAI failed auth (missing/invalid key) and Gemini may be used instead. */
export function isOpenAiAuthFailure(err?: string): boolean {
  if (!err) return false;
  return (
    /\b401\b/.test(err) ||
    /\b403\b/.test(err) ||
    /invalid.*api.*key/i.test(err) ||
    /incorrect api key/i.test(err) ||
    /authentication/i.test(err) ||
    /OPENAI_API_KEY is not configured/i.test(err)
  );
}

function geminiChatConfig(): ChatConfig | null {
  const apiKey = geminiApiKey();
  if (!apiKey) return null;
  return { provider: "gemini", apiKey, chatModel: GEMINI_CHAT_MODEL };
}

export function getOpenAiChatModel(): string {
  const m = Deno.env.get("OPENAI_CHAT_MODEL")?.trim();
  return m || DEFAULT_OPENAI_CHAT_MODEL;
}

export type ChatConfig =
  | { provider: AiProvider; apiKey: string; chatModel: string }
  | { error: string };

export function getChatConfig(): ChatConfig {
  const provider = resolveAiProvider();
  if (provider === "openai") {
    const apiKey = openAiApiKey();
    if (!apiKey) {
      const fallback = geminiChatConfig();
      if (fallback) return fallback;
      return { error: "OPENAI_API_KEY is not configured." };
    }
    return { provider, apiKey, chatModel: getOpenAiChatModel() };
  }
  const gemini = geminiChatConfig();
  if (gemini) return gemini;
  return { error: "GEMINI_API_KEY is not configured." };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractGeminiText(data: unknown): string {
  if (!isRecord(data)) return "";
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = candidates[0];
  if (!isRecord(first)) return "";
  const content = first.content;
  if (!isRecord(content)) return "";
  const parts = content.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (isRecord(p) && typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

function extractOpenAiText(data: unknown): string {
  if (!isRecord(data)) return "";
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first = choices[0];
  if (!isRecord(first)) return "";
  const message = first.message;
  if (!isRecord(message)) return "";
  return typeof message.content === "string" ? message.content.trim() : "";
}

async function callGeminiJson(
  systemText: string,
  userPayload: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<ChatCallResult> {
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: userPayload }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    return {
      rawText: "",
      ok: false,
      err: `Gemini request failed (${geminiRes.status}): ${errText.slice(0, 500)}`,
    };
  }
  const geminiJson: unknown = await geminiRes.json().catch(() => null);
  return { rawText: extractGeminiText(geminiJson), ok: true };
}

async function callOpenAiJson(
  systemText: string,
  userPayload: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<ChatCallResult> {
  const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: userPayload },
      ],
      temperature,
      max_tokens: maxOutputTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!openAiRes.ok) {
    const errText = await openAiRes.text().catch(() => "");
    return {
      rawText: "",
      ok: false,
      err: `OpenAI request failed (${openAiRes.status}): ${errText.slice(0, 500)}`,
    };
  }
  const openAiJson: unknown = await openAiRes.json().catch(() => null);
  return { rawText: extractOpenAiText(openAiJson), ok: true };
}

async function callGeminiJsonConfigured(
  systemText: string,
  userPayload: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<ChatCallResult> {
  const apiKey = geminiApiKey();
  if (!apiKey) return { rawText: "", ok: false, err: "GEMINI_API_KEY is not configured." };
  return callGeminiJson(
    systemText,
    userPayload,
    apiKey,
    GEMINI_CHAT_MODEL,
    temperature,
    maxOutputTokens,
  );
}

/** JSON-mode chat completion (Gemini or OpenAI per AI_PROVIDER / keys). */
export async function callChatJson(
  systemText: string,
  userPayload: string,
  temperature = 0.42,
  maxOutputTokens = 4096,
  providerOverride?: AiProvider,
): Promise<ChatCallResult> {
  const provider = providerOverride ?? resolveAiProvider();

  if (provider === "openai") {
    const apiKey = openAiApiKey();
    if (!apiKey) {
      const fallback = await callGeminiJsonConfigured(systemText, userPayload, temperature, maxOutputTokens);
      return fallback.ok ? fallback : { rawText: "", ok: false, err: "OPENAI_API_KEY is not configured." };
    }
    const openAiResult = await callOpenAiJson(
      systemText,
      userPayload,
      apiKey,
      getOpenAiChatModel(),
      temperature,
      maxOutputTokens,
    );
    if (openAiResult.ok || !isOpenAiAuthFailure(openAiResult.err)) return openAiResult;
    const fallback = await callGeminiJsonConfigured(systemText, userPayload, temperature, maxOutputTokens);
    return fallback.ok ? fallback : openAiResult;
  }

  return callGeminiJsonConfigured(systemText, userPayload, temperature, maxOutputTokens);
}

async function embedGeminiQuery(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBEDDING_MODEL}`,
          content: { parts: [{ text: text.slice(0, 6000) }] },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: EMBEDDING_DIMS,
        }),
      },
    );
    if (!res.ok) return null;
    const j = await res.json() as { embedding?: { values?: number[] } };
    const v = j?.embedding?.values;
    return Array.isArray(v) && v.length === EMBEDDING_DIMS ? v : null;
  } catch {
    return null;
  }
}

async function embedOpenAiQuery(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text.slice(0, 6000),
        dimensions: EMBEDDING_DIMS,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json() as { data?: { embedding?: number[] }[] };
    const v = j?.data?.[0]?.embedding;
    return Array.isArray(v) && v.length === EMBEDDING_DIMS ? v : null;
  } catch {
    return null;
  }
}

/** Query embedding for semantic retrieval (768 dims to match pgvector columns). */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const provider = resolveAiProvider();
  if (provider === "openai") {
    const apiKey = openAiApiKey();
    if (!apiKey) {
      const geminiKey = geminiApiKey();
      return geminiKey ? embedGeminiQuery(text, geminiKey) : null;
    }
    const vec = await embedOpenAiQuery(text, apiKey);
    if (vec) return vec;
    const geminiKey = geminiApiKey();
    return geminiKey ? embedGeminiQuery(text, geminiKey) : null;
  }
  const apiKey = geminiApiKey();
  if (!apiKey) return null;
  return embedGeminiQuery(text, apiKey);
}
