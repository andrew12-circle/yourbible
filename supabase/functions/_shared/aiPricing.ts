/** Per-unit pricing (USD) for estimated cost — update when vendor rates change. */

export type PricingUnit = "per_1k_input_tokens" | "per_1k_output_tokens" | "per_1k_tokens" | "per_minute_audio";

export type ModelPricing = {
  input?: number;
  output?: number;
  blended?: number;
  unit: PricingUnit;
};

/** Keys are normalized model id substrings matched with includes(). */
const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-5.5": { input: 0.0025, output: 0.01, unit: "per_1k_input_tokens" },
  "gpt-4o": { input: 0.0025, output: 0.01, unit: "per_1k_input_tokens" },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006, unit: "per_1k_input_tokens" },
  "text-embedding-3-small": { blended: 0.00002, unit: "per_1k_tokens" },
  "gemini-2.5-pro": { input: 0.00125, output: 0.01, unit: "per_1k_input_tokens" },
  "gemini-2.5-flash": { input: 0.0003, output: 0.0025, unit: "per_1k_input_tokens" },
  "gemini-3-flash": { input: 0.0003, output: 0.0025, unit: "per_1k_input_tokens" },
  "gemini-embedding": { blended: 0.00001, unit: "per_1k_tokens" },
  "nova-2": { blended: 0.0043, unit: "per_minute_audio" },
  "assemblyai": { blended: 0.00065, unit: "per_minute_audio" },
  "elevenlabs-stt": { blended: 0.006, unit: "per_minute_audio" },
};

const PROVIDER_DEFAULTS: Record<string, ModelPricing> = {
  openai: { input: 0.0025, output: 0.01, unit: "per_1k_input_tokens" },
  gemini: { input: 0.0003, output: 0.0025, unit: "per_1k_input_tokens" },
  deepgram: { blended: 0.0043, unit: "per_minute_audio" },
  assemblyai: { blended: 0.00065, unit: "per_minute_audio" },
  elevenlabs: { blended: 0.006, unit: "per_minute_audio" },
};

function resolvePricing(model: string | undefined, provider: string): ModelPricing {
  const m = (model ?? "").toLowerCase();
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (m.includes(key)) return pricing;
  }
  return PROVIDER_DEFAULTS[provider] ?? { blended: 0.001, unit: "per_1k_tokens" };
}

export function estimateUsd(params: {
  provider: string;
  model?: string;
  operation: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputChars?: number;
  outputChars?: number;
  audioSeconds?: number;
}): number {
  const pricing = resolvePricing(params.model, params.provider);
  const prompt = params.promptTokens ?? 0;
  const completion = params.completionTokens ?? 0;
  const total = params.totalTokens ?? prompt + completion;

  if (pricing.unit === "per_minute_audio") {
    const sec = params.audioSeconds ?? 0;
    const minutes = sec / 60;
    return minutes * (pricing.blended ?? 0);
  }

  if (pricing.unit === "per_1k_tokens" || params.operation === "embed") {
    const tokens = total || Math.ceil(((params.inputChars ?? 0) + (params.outputChars ?? 0)) / 4);
    return (tokens / 1000) * (pricing.blended ?? 0.00002);
  }

  const inTok = prompt || Math.ceil((params.inputChars ?? 0) / 4);
  const outTok = completion || Math.ceil((params.outputChars ?? 0) / 4);
  const inRate = pricing.input ?? 0.001;
  const outRate = pricing.output ?? 0.003;
  return (inTok / 1000) * inRate + (outTok / 1000) * outRate;
}
