import type { ResponseDepthSetting } from "@/lib/journal/responseDepth";
import type { MyAiChatRequestBody } from "@/lib/myai/invokeMyAiChat";
import { myAiBodyForResearchScope, type MyAiResearchScope } from "@/lib/myai/researchScope";

/** ChatGPT-first (default) vs inward library-first companion. */
export type MyAiCompanionMode = "chatgpt" | "inward";

export const MY_AI_COMPANION_MODE_STORAGE_KEY = "my_ai.companion_mode";

export const MY_AI_COMPANION_MODE_LABELS: Record<MyAiCompanionMode, string> = {
  chatgpt: "ChatGPT",
  inward: "Inward companion",
};

export const MY_AI_COMPANION_MODE_HINTS: Record<MyAiCompanionMode, string> = {
  chatgpt: "Smart, thorough answers first — your library enriches when relevant",
  inward: "Your saved library first — general knowledge only when needed",
};

export function readCompanionModeSetting(
  fallback: MyAiCompanionMode = "chatgpt",
): MyAiCompanionMode {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(MY_AI_COMPANION_MODE_STORAGE_KEY);
  if (v === "inward" || v === "chatgpt") return v;
  return fallback;
}

export function persistCompanionModeSetting(value: MyAiCompanionMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MY_AI_COMPANION_MODE_STORAGE_KEY, value);
}

type TurnDefaults = {
  companionMode: MyAiCompanionMode;
  includeGeneral: boolean;
  responseDepth: ResponseDepthSetting;
};

/** Map UI companion mode + settings to my-ai-chat request flags. */
export function myAiBodyForCompanionMode(
  defaults: TurnDefaults,
): Pick<MyAiChatRequestBody, "companion_mode" | "include_general_knowledge" | "response_depth"> {
  if (defaults.companionMode === "chatgpt") {
    return {
      companion_mode: "chatgpt",
      include_general_knowledge: true,
      response_depth: defaults.responseDepth === "reflect" ? "reflect" : "deep",
    };
  }
  return {
    companion_mode: "inward",
    include_general_knowledge: defaults.includeGeneral,
    response_depth: defaults.responseDepth,
  };
}

/** Merge companion mode defaults with optional per-turn research scope chips. */
export function buildMyAiTurnBody(
  scope: MyAiResearchScope | undefined,
  defaults: TurnDefaults,
): Pick<
  MyAiChatRequestBody,
  "companion_mode" | "include_general_knowledge" | "response_depth" | "research_scope"
> {
  const modeFlags = myAiBodyForCompanionMode(defaults);
  if (!scope) return modeFlags;
  const scopeFlags = myAiBodyForResearchScope(scope, {
    includeGeneral: modeFlags.include_general_knowledge ?? defaults.includeGeneral,
    responseDepth: (modeFlags.response_depth ?? defaults.responseDepth) as ResponseDepthSetting,
  });
  return { ...modeFlags, ...scopeFlags };
}
