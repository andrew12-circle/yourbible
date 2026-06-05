export type ResponseDepthSetting = "auto" | "reflect" | "deep";
export type ResolvedResponseDepth = "reflect" | "deep";

const FAITH_STRUGGLE_SIGNALS = [
  "why",
  "god",
  "lord",
  "jesus",
  "christ",
  "pray",
  "prayer",
  "wisdom",
  "suffer",
  "obedien",
  "supposed to",
  "real time",
  "real-time",
  "following",
  "faith",
  "should i",
  "doesn't work",
  "doesnt work",
  "does not work",
  "inept",
  "weight",
  "shoulders",
  "guidance",
  "path",
  "trust god",
  "trust the lord",
  "hardship",
  "trial",
  "bible",
  "scripture",
  "spirit",
  "holy spirit",
];

const MOOD_ONLY_SIGNALS = [
  "heavy day",
  "tired",
  "exhausted",
  "rough day",
  "long day",
  "drained",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasSignal(text: string, signals: string[]): boolean {
  const n = normalize(text);
  return signals.some((s) => n.includes(s));
}

function hasExistentialShape(text: string): boolean {
  const n = normalize(text);
  if (n.includes("?")) return true;
  return (
    hasSignal(n, ["why", "should i", "doesn't work", "doesnt work", "does not work", "supposed to"]) ||
    (hasSignal(n, FAITH_STRUGGLE_SIGNALS) && n.length >= 80)
  );
}

export function detectAutoResponseDepth(message: string): ResolvedResponseDepth {
  const n = normalize(message);
  if (!n) return "reflect";

  const moodOnly = hasSignal(n, MOOD_ONLY_SIGNALS) && n.length < 120;
  const faithSignals = hasSignal(n, FAITH_STRUGGLE_SIGNALS);
  const existential = hasExistentialShape(message);

  if (moodOnly && !faithSignals) return "reflect";
  if (faithSignals && existential) return "deep";
  if (faithSignals && n.length >= 160) return "deep";
  return "reflect";
}

export function resolveResponseDepth(
  setting: ResponseDepthSetting | undefined,
  userMessage: string,
): ResolvedResponseDepth {
  const mode = setting ?? "auto";
  if (mode === "reflect") return "reflect";
  if (mode === "deep") return "deep";
  return detectAutoResponseDepth(userMessage);
}

export function parseResponseDepthSetting(raw: unknown): ResponseDepthSetting {
  if (raw === "reflect" || raw === "deep" || raw === "auto") return raw;
  return "auto";
}
