/** Shared AI provider helpers for edge functions (chat + query embeddings). */

import {
  logAiUsage,
  logAiUsageFromResponse,
  parseGeminiUsageMetadata,
  parseOpenAiUsage,
} from "./logAiUsage.ts";
import {
  openAiMaxOutputFields,
  openAiTemperatureField,
} from "./openAiModelParams.ts";

export {
  openAiSupportsCustomTemperature,
  openAiUsesMaxCompletionTokens,
} from "./openAiModelParams.ts";

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
  if (openAiApiKey()) return "openai";
  return "gemini";
}

const GEMINI_TOOL_GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_TOOL_MODEL = Deno.env.get("GEMINI_TOOL_MODEL")?.trim() || "gemini-2.5-flash";
const CHAT_TOOLS_TIMEOUT_MS = envInt("AI_CHAT_TOOLS_TIMEOUT_MS", 150_000);

function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function replayResponse(res: Response): Promise<{ res: Response; body: unknown }> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return {
    res: new Response(text, { status: res.status, statusText: res.statusText, headers: res.headers }),
    body,
  };
}

/** Tool-calling chat (OpenAI or Gemini OpenAI-compat gateway). */
export async function callChatWithTools(
  messages: { role: string; content: string }[],
  tools: unknown[],
  toolChoice: unknown,
  maxOutputTokens = 8192,
  providerOverride?: AiProvider,
): Promise<Response> {
  const started = Date.now();
  const inputChars = messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  const provider = providerOverride ?? resolveAiProvider();

  if (provider === "openai") {
    const apiKey = openAiApiKey();
    if (apiKey) {
      const model = getOpenAiChatModel();
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: toolChoice,
          ...openAiMaxOutputFields(model, maxOutputTokens),
        }),
        signal: AbortSignal.timeout(CHAT_TOOLS_TIMEOUT_MS),
      });
      const { res: replayed, body } = await replayResponse(res);
      logAiUsageFromResponse({
        res: replayed,
        body,
        provider: "openai",
        model,
        operation: "chat_tools",
        inputChars,
        durationMs: Date.now() - started,
      });
      if (replayed.ok || !geminiApiKey()) return replayed;
      console.warn(`OpenAI chat_tools HTTP ${replayed.status}; falling back to Gemini`);
    }
  }

  const geminiKey = geminiApiKey();
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: "No AI API key configured" }), { status: 502 });
  }
  const res = await fetch(GEMINI_TOOL_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${geminiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_TOOL_MODEL,
      messages,
      tools,
      tool_choice: toolChoice,
      max_tokens: maxOutputTokens,
    }),
    signal: AbortSignal.timeout(CHAT_TOOLS_TIMEOUT_MS),
  });
  const { res: replayed, body } = await replayResponse(res);
  logAiUsageFromResponse({
    res: replayed,
    body,
    provider: "gemini",
    model: GEMINI_TOOL_MODEL,
    operation: "chat_tools",
    inputChars,
    durationMs: Date.now() - started,
  });
  return replayed;
}

/** Document embedding for embed-row (768 dims). */
export async function embedDocument(text: string): Promise<number[] | null> {
  const trimmed = text.slice(0, 8000);
  const provider = resolveAiProvider();
  if (provider === "openai") {
    const apiKey = openAiApiKey();
    if (apiKey) {
      const vec = await embedOpenAiQuery(trimmed, apiKey);
      if (vec) return vec;
    }
  }
  const geminiKey = geminiApiKey();
  return geminiKey ? embedGeminiQuery(trimmed, geminiKey) : null;
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

export function getOpenAiWebChatModel(): string {
  const m = Deno.env.get("OPENAI_WEB_CHAT_MODEL")?.trim();
  if (m) return m;
  // Responses API web_search is most reliable on gpt-4o; chat model may not support browsing.
  return "gpt-4o";
}

/** OpenAI Responses API with hosted web_search — ChatGPT-style browsing on your key. */
export async function callOpenAiWebResearchChat(
  instructions: string,
  input: string,
  maxOutputTokens = 8192,
): Promise<ChatCallResult> {
  const apiKey = openAiApiKey();
  if (!apiKey) return { rawText: "", ok: false, err: "OPENAI_API_KEY is not configured." };

  const model = getOpenAiWebChatModel();
  const searchContextSize = Deno.env.get("OPENAI_WEB_SEARCH_CONTEXT")?.trim() || "medium";
  const started = Date.now();
  const inputChars = instructions.length + input.length;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      tools: [{ type: "web_search", search_context_size: searchContextSize }],
      tool_choice: "required",
      max_output_tokens: maxOutputTokens,
    }),
  });

  const body: unknown = await res.json().catch(() => null);
  const rawText = extractOpenAiResponsesText(body);
  const usage = parseOpenAiUsage(body);
  logAiUsage({
    operation: "chat_web_search",
    provider: "openai",
    model,
    status: res.ok && rawText ? "ok" : "error",
    httpStatus: res.status,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    inputChars,
    outputChars: rawText.length,
    durationMs: Date.now() - started,
  });

  if (!res.ok) {
    const errText = JSON.stringify(body).slice(0, 500);
    return { rawText: "", ok: false, err: `OpenAI web search failed (${res.status}): ${errText}` };
  }
  if (!rawText) {
    return { rawText: "", ok: false, err: "OpenAI web search returned empty text." };
  }
  return { rawText, ok: true };
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

function extractOpenAiResponsesText(data: unknown): string {
  if (!isRecord(data)) return "";
  const outputText = data.output_text;
  if (typeof outputText === "string" && outputText.trim()) return outputText.trim();
  const output = data.output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    if (!isRecord(item) || item.type !== "message") continue;
    const content = item.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!isRecord(block)) continue;
      if (block.type === "output_text" && typeof block.text === "string" && block.text.trim()) {
        parts.push(block.text.trim());
      }
    }
  }
  return parts.join("\n\n").trim();
}

async function callGeminiJson(
  systemText: string,
  userPayload: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<ChatCallResult> {
  const started = Date.now();
  const inputChars = systemText.length + userPayload.length;
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
  const geminiJson: unknown = await geminiRes.json().catch(() => null);
  const rawText = extractGeminiText(geminiJson);
  const usage = parseGeminiUsageMetadata(geminiJson);
  logAiUsage({
    operation: "chat_json",
    provider: "gemini",
    model,
    status: geminiRes.ok ? "ok" : "error",
    httpStatus: geminiRes.status,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    inputChars,
    outputChars: rawText.length,
    durationMs: Date.now() - started,
  });
  if (!geminiRes.ok) {
    const errText = JSON.stringify(geminiJson).slice(0, 500);
    return {
      rawText: "",
      ok: false,
      err: `Gemini request failed (${geminiRes.status}): ${errText}`,
    };
  }
  return { rawText, ok: true };
}

async function callOpenAiJson(
  systemText: string,
  userPayload: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<ChatCallResult> {
  const started = Date.now();
  const inputChars = systemText.length + userPayload.length;
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
      ...openAiTemperatureField(model, temperature),
      ...openAiMaxOutputFields(model, maxOutputTokens),
      response_format: { type: "json_object" },
    }),
  });
  const openAiJson: unknown = await openAiRes.json().catch(() => null);
  const rawText = extractOpenAiText(openAiJson);
  const usage = parseOpenAiUsage(openAiJson);
  logAiUsage({
    operation: "chat_json",
    provider: "openai",
    model,
    status: openAiRes.ok ? "ok" : "error",
    httpStatus: openAiRes.status,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    inputChars,
    outputChars: rawText.length,
    durationMs: Date.now() - started,
  });
  if (!openAiRes.ok) {
    const errText = JSON.stringify(openAiJson).slice(0, 500);
    return {
      rawText: "",
      ok: false,
      err: `OpenAI request failed (${openAiRes.status}): ${errText}`,
    };
  }
  return { rawText, ok: true };
}

async function callGeminiJsonConfigured(
  systemText: string,
  userPayload: string,
  temperature: number,
  maxOutputTokens: number,
  modelOverride?: string,
): Promise<ChatCallResult> {
  const apiKey = geminiApiKey();
  if (!apiKey) return { rawText: "", ok: false, err: "GEMINI_API_KEY is not configured." };
  return callGeminiJson(
    systemText,
    userPayload,
    apiKey,
    modelOverride?.trim() || GEMINI_CHAT_MODEL,
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
  modelOverride?: string,
): Promise<ChatCallResult> {
  const provider = providerOverride ?? resolveAiProvider();

  if (provider === "openai") {
    const apiKey = openAiApiKey();
    if (!apiKey) {
      const fallback = await callGeminiJsonConfigured(
        systemText,
        userPayload,
        temperature,
        maxOutputTokens,
        modelOverride,
      );
      return fallback.ok ? fallback : { rawText: "", ok: false, err: "OPENAI_API_KEY is not configured." };
    }
    const openAiModel = modelOverride?.trim() || getOpenAiChatModel();
    const openAiResult = await callOpenAiJson(
      systemText,
      userPayload,
      apiKey,
      openAiModel,
      temperature,
      maxOutputTokens,
    );
    if (openAiResult.ok || !isOpenAiAuthFailure(openAiResult.err)) return openAiResult;
    const fallback = await callGeminiJsonConfigured(
      systemText,
      userPayload,
      temperature,
      maxOutputTokens,
      modelOverride,
    );
    if (fallback.ok) return fallback;
    // Prefer the fallback error (e.g. Gemini rate limit) over a stale OpenAI 401.
    if (fallback.err) return fallback;
    return openAiResult;
  }

  return callGeminiJsonConfigured(systemText, userPayload, temperature, maxOutputTokens, modelOverride);
}

async function embedGeminiQuery(text: string, apiKey: string): Promise<number[] | null> {
  const started = Date.now();
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
    const j = await res.json().catch(() => null) as { embedding?: { values?: number[] } };
    const v = j?.embedding?.values;
    const ok = res.ok && Array.isArray(v) && v.length === EMBEDDING_DIMS;
    logAiUsage({
      operation: "embed",
      provider: "gemini",
      model: GEMINI_EMBEDDING_MODEL,
      status: ok ? "ok" : "error",
      httpStatus: res.status,
      inputChars: text.length,
      embeddingDims: EMBEDDING_DIMS,
      totalTokens: Math.ceil(text.length / 4),
      durationMs: Date.now() - started,
    });
    return ok ? v : null;
  } catch {
    logAiUsage({
      operation: "embed",
      provider: "gemini",
      model: GEMINI_EMBEDDING_MODEL,
      status: "error",
      inputChars: text.length,
    });
    return null;
  }
}

async function embedOpenAiQuery(text: string, apiKey: string): Promise<number[] | null> {
  const started = Date.now();
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
    const j = await res.json().catch(() => null) as { data?: { embedding?: number[] }[] };
    const v = j?.data?.[0]?.embedding;
    const usage = parseOpenAiUsage(j);
    const ok = res.ok && Array.isArray(v) && v.length === EMBEDDING_DIMS;
    logAiUsage({
      operation: "embed",
      provider: "openai",
      model: OPENAI_EMBEDDING_MODEL,
      status: ok ? "ok" : "error",
      httpStatus: res.status,
      inputChars: text.length,
      embeddingDims: EMBEDDING_DIMS,
      promptTokens: usage.promptTokens,
      totalTokens: usage.totalTokens ?? Math.ceil(text.length / 4),
      durationMs: Date.now() - started,
    });
    return ok ? v : null;
  } catch {
    logAiUsage({
      operation: "embed",
      provider: "openai",
      model: OPENAI_EMBEDDING_MODEL,
      status: "error",
      inputChars: text.length,
    });
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

const GEMINI_OPENAI_GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

/** OpenAI-compatible streaming chat (OpenAI or Gemini gateway). Returns upstream Response. */
export async function fetchChatCompletionStream(
  systemText: string,
  userPayload: string,
  temperature = 0.55,
  maxOutputTokens = 4096,
): Promise<Response> {
  const started = Date.now();
  const inputChars = systemText.length + userPayload.length;
  const provider = resolveAiProvider();

  if (provider === "openai") {
    const apiKey = openAiApiKey();
    if (apiKey) {
      const model = getOpenAiChatModel();
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
          ...openAiTemperatureField(model, temperature),
          ...openAiMaxOutputFields(model, maxOutputTokens),
          stream: true,
        }),
      });
      logAiUsage({
        operation: "chat_stream",
        provider: "openai",
        model,
        status: res.ok ? "ok" : "error",
        httpStatus: res.status,
        inputChars,
        durationMs: Date.now() - started,
      });
      return res;
    }
  }

  const geminiKey = geminiApiKey();
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: "No AI API key configured" }), { status: 502 });
  }
  const res = await fetch(GEMINI_OPENAI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${geminiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_CHAT_MODEL,
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: userPayload },
      ],
      temperature,
      max_tokens: maxOutputTokens,
      stream: true,
    }),
  });
  logAiUsage({
    operation: "chat_stream",
    provider: "gemini",
    model: GEMINI_CHAT_MODEL,
    status: res.ok ? "ok" : "error",
    httpStatus: res.status,
    inputChars,
    durationMs: Date.now() - started,
  });
  return res;
}
