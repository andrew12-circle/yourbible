import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { estimateUsd } from "./aiPricing.ts";

export type AiUsageContext = {
  functionName: string;
  userId?: string | null;
  artifactId?: string | null;
  journalEntryId?: string | null;
  chatId?: string | null;
};

export type AiUsageLogInput = {
  operation: string;
  provider: string;
  model?: string;
  status: "ok" | "error" | "rate_limit" | "billing";
  httpStatus?: number;
  errorMessage?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputChars?: number;
  outputChars?: number;
  embeddingDims?: number;
  batchSize?: number;
  durationMs?: number;
  audioSeconds?: number;
  metadata?: Record<string, unknown>;
  /** Override context function name for this row only */
  functionName?: string;
};

let usageContext: AiUsageContext | null = null;

export function setAiUsageContext(ctx: AiUsageContext): void {
  usageContext = ctx;
}

export function clearAiUsageContext(): void {
  usageContext = null;
}

export function getAiUsageContext(): AiUsageContext | null {
  return usageContext;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseOpenAiUsage(data: unknown): {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
} {
  if (!isRecord(data)) return {};
  const usage = data.usage;
  if (!isRecord(usage)) return {};
  const prompt = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined;
  const completion = typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined;
  const total = typeof usage.total_tokens === "number"
    ? usage.total_tokens
    : (prompt ?? 0) + (completion ?? 0);
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total || undefined };
}

export function parseGeminiUsageMetadata(data: unknown): {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
} {
  if (!isRecord(data)) return {};
  const meta = data.usageMetadata ?? data.usage_metadata;
  if (!isRecord(meta)) return {};
  const prompt = typeof meta.promptTokenCount === "number"
    ? meta.promptTokenCount
    : typeof meta.prompt_token_count === "number"
    ? meta.prompt_token_count
    : undefined;
  const completion = typeof meta.candidatesTokenCount === "number"
    ? meta.candidatesTokenCount
    : typeof meta.candidates_token_count === "number"
    ? meta.candidates_token_count
    : undefined;
  const total = typeof meta.totalTokenCount === "number"
    ? meta.totalTokenCount
    : typeof meta.total_token_count === "number"
    ? meta.total_token_count
    : (prompt ?? 0) + (completion ?? 0);
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total || undefined };
}

function statusFromHttp(httpStatus?: number): AiUsageLogInput["status"] {
  if (httpStatus === 429) return "rate_limit";
  if (httpStatus === 402) return "billing";
  if (httpStatus != null && httpStatus >= 400) return "error";
  return "ok";
}

let adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient(): ReturnType<typeof createClient> | null {
  if (adminClient) return adminClient;
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!url || !key) return null;
  adminClient = createClient(url, key, { auth: { persistSession: false } });
  return adminClient;
}

/** Fire-and-forget insert; never throws to callers. */
export function logAiUsage(input: AiUsageLogInput): void {
  const ctx = usageContext;
  const functionName = input.functionName ?? ctx?.functionName ?? "unknown";
  const userId = ctx?.userId ?? null;
  const estimated = estimateUsd({
    provider: input.provider,
    model: input.model,
    operation: input.operation,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    totalTokens: input.totalTokens,
    inputChars: input.inputChars,
    outputChars: input.outputChars,
    audioSeconds: input.audioSeconds,
  });

  const row = {
    user_id: userId,
    artifact_id: ctx?.artifactId ?? null,
    journal_entry_id: ctx?.journalEntryId ?? null,
    chat_id: ctx?.chatId ?? null,
    function_name: functionName,
    operation: input.operation,
    provider: input.provider,
    model: input.model ?? null,
    input_chars: input.inputChars ?? null,
    output_chars: input.outputChars ?? null,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    total_tokens: input.totalTokens ?? null,
    embedding_dims: input.embeddingDims ?? null,
    batch_size: input.batchSize ?? 1,
    duration_ms: input.durationMs ?? null,
    audio_seconds: input.audioSeconds ?? null,
    status: input.status,
    http_status: input.httpStatus ?? null,
    error_message: input.errorMessage?.slice(0, 500) ?? null,
    estimated_usd: estimated,
    metadata: input.metadata ?? {},
  };

  const client = getAdminClient();
  if (!client) {
    console.warn("[ai-usage] skip log — no service role", functionName, input.operation);
    return;
  }

  void client.from("ai_usage_events").insert(row).then(({ error }) => {
    if (error) console.warn("[ai-usage] insert failed:", error.message);
  });
}

export function logAiUsageFromResponse(params: {
  res: Response;
  body: unknown;
  provider: string;
  model?: string;
  operation: string;
  inputChars?: number;
  outputChars?: number;
  durationMs?: number;
}): void {
  const httpStatus = params.res.status;
  const status = statusFromHttp(httpStatus);
  let usage = params.provider === "openai"
    ? parseOpenAiUsage(params.body)
    : parseGeminiUsageMetadata(params.body);

  if (!usage.totalTokens && params.provider === "openai" && isRecord(params.body)) {
    usage = parseOpenAiUsage(params.body);
  }

  logAiUsage({
    operation: params.operation,
    provider: params.provider,
    model: params.model,
    status: status === "ok" && !params.res.ok ? "error" : status,
    httpStatus,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    inputChars: params.inputChars,
    outputChars: params.outputChars,
    durationMs: params.durationMs,
  });
}
