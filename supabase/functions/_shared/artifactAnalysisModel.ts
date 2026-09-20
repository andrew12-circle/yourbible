import { getFrameworkAnalyzeChatConfig } from "./aiProvider.ts";
import { openAiMaxOutputFields, openAiTemperatureField } from "./openAiModelParams.ts";

/** Bounded model request. Invalid output is a failed job, never an empty success. */
export async function callArtifactAnalysisModel(system: string, input: string): Promise<string> {
  const config = getFrameworkAnalyzeChatConfig();
  if ("error" in config) throw new Error(config.error);
  const signal = AbortSignal.timeout(90_000);
  let response: Response;
  if (config.provider === "openai") {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.chatModel,
        messages: [{ role: "system", content: system }, { role: "user", content: input }],
        response_format: { type: "json_object" },
        ...openAiMaxOutputFields(config.chatModel, 7000),
        ...openAiTemperatureField(config.chatModel, 0.2),
      }),
    });
  } else {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.chatModel)}:generateContent`, {
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
