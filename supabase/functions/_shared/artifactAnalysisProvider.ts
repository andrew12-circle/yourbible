import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { openAiMaxOutputFields } from "./openAiModelParams.ts";

import { AnalysisProviderError, classifyAnalysisFailure } from "./artifactAnalysisErrors.ts";
export { AnalysisProviderError } from "./artifactAnalysisErrors.ts";

/** One bounded call per provider. Runtime timeouts are not a substitute for durable checkpoints. */
export async function callArtifactAnalysisJson(system: string, payload: unknown, ctx: {
  db: SupabaseClient; userId: string; artifactId: string; operation: string;
}): Promise<unknown> {
  const preferred = Deno.env.get("FRAMEWORK_ANALYZE_AI_PROVIDER")?.trim() || "gemini";
  const providers = [...new Set([preferred, "gemini", "openai"])].filter(p =>
    (p === "openai" && Deno.env.get("OPENAI_API_KEY")) || (p === "gemini" && Deno.env.get("GEMINI_API_KEY")));
  let lastError: Error = new AnalysisProviderError("No analysis API provider is configured.", false);
  for (const provider of providers) {
    const openai = provider === "openai";
    const model = Deno.env.get(openai ? "FRAMEWORK_ANALYZE_OPENAI_MODEL" : "GEMINI_TOOL_MODEL")?.trim()
      || (openai ? Deno.env.get("OPENAI_CHAT_MODEL")?.trim() || "gpt-5.5" : "gemini-2.5-flash");
    const key = Deno.env.get(openai ? "OPENAI_API_KEY" : "GEMINI_API_KEY")!;
    const started = Date.now();
    let status = 0;
    try {
      const res = await fetch(openai ? "https://api.openai.com/v1/chat/completions" : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(payload) }],
          response_format: { type: "json_object" }, ...(openai ? openAiMaxOutputFields(model, 8192) : { max_tokens: 8192 }) }),
      });
      status = res.status;
      const body = await res.json().catch(() => null);
      if (!res.ok) throw classifyAnalysisFailure(res.status, JSON.stringify(body), provider);
      const choice = body?.choices?.[0];
      if (choice?.finish_reason === "length" || typeof choice?.message?.content !== "string") {
        throw new AnalysisProviderError("Analysis returned an incomplete response; this section was not marked complete.", true);
      }
      const output = JSON.parse(choice.message.content);
      await ctx.db.from("ai_usage_events").insert({ user_id: ctx.userId, artifact_id: ctx.artifactId,
        function_name: "artifact-analysis-worker", operation: ctx.operation, provider, model, status: "ok", http_status: status,
        prompt_tokens: body.usage?.prompt_tokens, completion_tokens: body.usage?.completion_tokens,
        total_tokens: body.usage?.total_tokens, duration_ms: Date.now() - started });
      return output;
    } catch (error) {
      lastError = error instanceof AnalysisProviderError ? error : new AnalysisProviderError(
        error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
          ? `${provider} analysis timed out. This section was not marked complete.`
          : `${provider} returned invalid analysis output or a network request failed.`, true);
      await ctx.db.from("ai_usage_events").insert({ user_id: ctx.userId, artifact_id: ctx.artifactId,
        function_name: "artifact-analysis-worker", operation: ctx.operation, provider, model, status: "error",
        http_status: status || null, error_message: lastError.message, duration_ms: Date.now() - started });
    }
  }
  throw lastError;
}
