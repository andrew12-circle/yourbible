import type { ResponseDepthSetting } from "@/lib/journal/responseDepth";
import type { MyAiChatRequestBody } from "@/lib/myai/invokeMyAiChat";

/** Per-turn research mode — inward deep search vs outward OpenAI vs web. */
export type MyAiResearchScope = "library" | "outside" | "web";

export const MY_AI_RESEARCH_SCOPE_LABELS: Record<MyAiResearchScope, string> = {
  library: "Search my library",
  outside: "Go wider (OpenAI)",
  web: "Search the web",
};

export const MY_AI_RESEARCH_SCOPE_HINTS: Record<MyAiResearchScope, string> = {
  library: "Deep search your videos, journals, and beliefs first",
  outside: "Add OpenAI knowledge after your saved library",
  web: "Live web search plus your framework context",
};

type ScopeDefaults = {
  includeGeneral: boolean;
  responseDepth: ResponseDepthSetting;
};

/** Map UI scope to my-ai-chat request flags for one turn. */
export function myAiBodyForResearchScope(
  scope: MyAiResearchScope | undefined,
  defaults: ScopeDefaults,
): Pick<MyAiChatRequestBody, "research_scope" | "include_general_knowledge" | "response_depth"> {
  if (!scope) {
    return {
      include_general_knowledge: defaults.includeGeneral,
      response_depth: defaults.responseDepth,
    };
  }
  if (scope === "library") {
    return {
      research_scope: "library",
      include_general_knowledge: false,
      response_depth: "deep",
    };
  }
  return {
    research_scope: scope,
    include_general_knowledge: true,
    response_depth: "deep",
  };
}
