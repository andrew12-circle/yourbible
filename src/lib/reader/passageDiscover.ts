import type { DiscoveredSource } from "@/lib/framework/claimResearchPack";

export type PassageDiscoverResp = {
  discovered_sources: DiscoveredSource[];
  scripture?: { ref: string; reference?: string; text?: string; error?: string }[];
  meta?: {
    passage_ref?: string;
    used_web?: boolean;
    web_provider?: string | null;
    used_youtube_api?: boolean;
    discovery_count?: number;
    discovery_queries?: string[];
  };
  error?: string;
};

export function passageDiscoverStatusLabel(meta: PassageDiscoverResp["meta"]): string {
  if (!meta) return "Search the web for videos, books, and articles on this passage.";
  const count = meta.discovery_count ?? 0;
  const parts: string[] = [];
  if (meta.used_youtube_api) parts.push("YouTube");
  if (meta.used_web) parts.push(`web (${meta.web_provider ?? "?"})`);
  if (parts.length && count > 0) {
    return `${count} sources via ${parts.join(" + ")} — not vetted; verify before trusting.`;
  }
  if (parts.length) return `Search ran (${parts.join(" + ")}) but found no sources.`;
  return "Configure WEB_SEARCH_PROVIDER and YOUTUBE_DATA_API_KEY on the server for live discovery.";
}
