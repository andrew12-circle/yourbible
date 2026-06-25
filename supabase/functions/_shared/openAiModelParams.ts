/** OpenAI chat completion request fields that vary by model family. */

/** Newer OpenAI chat models (gpt-5.x, o-series) use max_completion_tokens instead of max_tokens. */
export function openAiUsesMaxCompletionTokens(model: string): boolean {
  const m = model.trim().toLowerCase();
  const name = m.includes("/") ? (m.split("/").pop() ?? m) : m;
  if (/^o\d/.test(name)) return true;
  if (name.startsWith("gpt-5")) return true;
  return false;
}

export function openAiMaxOutputFields(model: string, maxOutputTokens: number): Record<string, number> {
  if (openAiUsesMaxCompletionTokens(model)) {
    return { max_completion_tokens: maxOutputTokens };
  }
  return { max_tokens: maxOutputTokens };
}

/** gpt-5 / o-series only support the default temperature (1); omit the param. */
export function openAiSupportsCustomTemperature(model: string): boolean {
  return !openAiUsesMaxCompletionTokens(model);
}

export function openAiTemperatureField(model: string, temperature: number): Record<string, number> {
  if (!openAiSupportsCustomTemperature(model)) return {};
  return { temperature };
}
