import { openAiMaxOutputFields, openAiTemperatureField } from "./openAiModelParams.ts";

type Config = { provider: "openai" | "gemini"; apiKey: string; model: string };
/** Same provider preference as framework analysis, without importing its global logging context. */
export function getArtifactAnalysisConfig(): Config {
  const explicit = Deno.env.get("FRAMEWORK_ANALYZE_AI_PROVIDER")?.trim().toLowerCase();
  let provider: Config["provider"] = explicit === "openai" ? "openai" : "gemini";
  const openAiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (provider === "openai" && !openAiKey && geminiKey) provider = "gemini";
  const apiKey = provider === "openai" ? openAiKey : geminiKey;
  if (!apiKey) throw new Error(`Analysis API key for ${provider} is not configured`);
  const model = Deno.env.get("FRAMEWORK_ANALYZE_MODEL")?.trim() || (provider === "openai"
    ? Deno.env.get("OPENAI_CHAT_MODEL")?.trim() || "gpt-5.5"
    : "gemini-2.5-flash");
  return { provider, apiKey, model };
}

/** Bounded model request. Invalid output is a failed job, never an empty success. */
export async function callArtifactAnalysisModel(system: string, input: string): Promise<string> {
  const config = getArtifactAnalysisConfig();
  const signal = AbortSignal.timeout(90_000);
  let response: Response;
  if (config.provider === "openai") {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "system", content: system }, { role: "user", content: input }],
        response_format: { type: "json_object" },
        ...openAiMaxOutputFields(config.model, 7000),
        ...openAiTemperatureField(config.model, 0.2),
      }),
    });
  } else {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 7000 },
      }),
    });
  }
  const body = await response.json();
  if (!response.ok) throw new Error(`Analysis provider HTTP ${response.status}: ${JSON.stringify(body).slice(0, 700)}`);
  const text: unknown = config.provider === "openai"
    ? body.choices?.[0]?.message?.content
    : body.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
  if (typeof text !== "string" || !text.trim()) throw new Error("Invalid JSON: provider returned no analysis");
  return text;
}
