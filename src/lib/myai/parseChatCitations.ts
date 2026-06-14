import type { JSONValue } from "@/integrations/supabase/types";

export type ChatCitationSourceType =
  | "belief"
  | "journal"
  | "artifact"
  | "entity"
  | "identity"
  | "general"
  | "influence"
  | "attribution";

export type ChatCitation = {
  source_type: ChatCitationSourceType;
  id?: string;
  label: string;
  /** YouTube watch URL when the source is a saved video artifact. */
  url?: string;
  /** Transcript timestamp — opens YouTube at this moment. */
  start_seconds?: number;
};

export type AnswerProvenance = "framework_only" | "framework_and_openai" | "web_openai";

export type ParsedChatCitations = {
  provenance: AnswerProvenance | null;
  /** Framework rows the answer drew on (beliefs, journals, etc.). */
  internalSources: ChatCitation[];
  /** Outside / OpenAI rows when explicitly cited. */
  outsideSources: ChatCitation[];
};

const SOURCE_TYPES = new Set<ChatCitationSourceType>([
  "belief",
  "journal",
  "artifact",
  "entity",
  "identity",
  "general",
  "influence",
  "attribution",
]);

const PROVENANCE_LABELS = new Set<AnswerProvenance>([
  "framework_only",
  "framework_and_openai",
  "web_openai",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseOne(item: unknown): ChatCitation | null {
  if (!isRecord(item)) return null;
  const st = item.source_type;
  const label = item.label;
  if (typeof st !== "string" || typeof label !== "string" || !label.trim()) return null;
  if (!SOURCE_TYPES.has(st as ChatCitationSourceType)) return null;
  const id = typeof item.id === "string" && item.id.length >= 32 ? item.id : undefined;
  const url = typeof item.url === "string" && item.url.trim() ? item.url.trim() : undefined;
  const startRaw = item.start_seconds;
  const start_seconds =
    typeof startRaw === "number" && Number.isFinite(startRaw) && startRaw > 0
      ? Math.floor(startRaw)
      : undefined;
  const base = { source_type: st as ChatCitationSourceType, label: label.trim(), ...(url ? { url } : {}), ...(start_seconds != null ? { start_seconds } : {}) };
  return id ? { ...base, id } : base;
}

export function parseChatCitations(raw: JSONValue | ChatCitation[] | unknown): ParsedChatCitations {
  const rows = Array.isArray(raw) ? raw : [];
  const parsed: ChatCitation[] = [];
  for (const item of rows) {
    const row = parseOne(item);
    if (row) parsed.push(row);
  }

  let provenance: AnswerProvenance | null = null;
  for (const c of parsed) {
    if (c.source_type !== "attribution") continue;
    if (PROVENANCE_LABELS.has(c.label as AnswerProvenance)) {
      provenance = c.label as AnswerProvenance;
      break;
    }
  }

  const outsideSources = parsed.filter((c) => c.source_type === "general");
  const internalSources = parsed.filter(
    (c) => c.source_type !== "general" && c.source_type !== "attribution",
  );

  if (!provenance) {
    if (outsideSources.some((c) => /web search/i.test(c.label))) {
      provenance = "web_openai";
    } else if (outsideSources.length > 0) {
      provenance = "framework_and_openai";
    } else if (internalSources.length > 0) {
      provenance = "framework_only";
    }
  }

  return { provenance, internalSources, outsideSources };
}

export type SourceAttributionDisplay =
  | { kind: "framework_only"; internalSources: ChatCitation[] }
  | { kind: "framework_primary"; internalSources: ChatCitation[] }
  | { kind: "openai_supplement"; internalSources: ChatCitation[]; outsideSources: ChatCitation[] }
  | { kind: "web_openai"; internalSources: ChatCitation[]; outsideSources: ChatCitation[] };

export function resolveSourceAttributionDisplay(parsed: ParsedChatCitations): SourceAttributionDisplay | null {
  const { provenance, internalSources, outsideSources } = parsed;
  const usedOutside = outsideSources.length > 0;
  const hasWeb = outsideSources.some((c) => /web search/i.test(c.label));

  if (hasWeb || provenance === "web_openai") {
    return { kind: "web_openai", internalSources, outsideSources };
  }

  if (usedOutside || provenance === "framework_and_openai") {
    if (internalSources.length > 0 && !usedOutside) {
      return { kind: "framework_primary", internalSources };
    }
    return { kind: "openai_supplement", internalSources, outsideSources };
  }

  if (provenance === "framework_only" || internalSources.length > 0) {
    return { kind: "framework_only", internalSources };
  }

  if (usedOutside) {
    return { kind: "openai_supplement", internalSources, outsideSources };
  }

  return null;
}
