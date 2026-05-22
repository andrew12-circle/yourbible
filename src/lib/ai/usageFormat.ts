const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  deepgram: "Deepgram",
  assemblyai: "AssemblyAI",
  elevenlabs: "ElevenLabs",
};

const OPERATION_LABELS: Record<string, string> = {
  chat_json: "Chat (JSON)",
  chat_tools: "Chat (tools)",
  embed: "Embeddings",
  stt: "Speech-to-text",
};

export function formatProvider(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function formatOperation(operation: string): string {
  return OPERATION_LABELS[operation] ?? operation;
}

export function formatFunctionName(name: string): string {
  return name
    .replace(/^framework-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatUsd(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  if (!Number.isFinite(n) || n === 0) return "$0.00";
  if (n < 0.01) return `<$0.01`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function formatTokenCount(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseInt(n, 10) : n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}
