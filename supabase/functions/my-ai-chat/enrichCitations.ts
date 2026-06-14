import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { canonicalYouTubeWatchUrl, resolveYouTubeVideoId } from "../_shared/youtubeVideoId.ts";
import { attachSourceAttribution } from "../_shared/chatSourceAttribution.ts";
import { mergeRetrievedCitations, type RetrievedCitation } from "./retrieval.ts";

export type EnrichableCitation = {
  source_type: string;
  id?: string;
  label: string;
  url?: string;
  start_seconds?: number;
};

type ArtifactUrlRow = {
  id: string;
  kind?: string | null;
  url?: string | null;
  metadata?: unknown;
};

export function youtubeWatchUrlFromArtifact(row: ArtifactUrlRow): string | null {
  if (row.kind !== "youtube") return null;
  const stored = typeof row.url === "string" ? row.url.trim() : "";
  const videoId = resolveYouTubeVideoId(stored || null, row.metadata, null);
  if (!videoId) return stored || null;
  return canonicalYouTubeWatchUrl(videoId, stored || null);
}

/** Attach YouTube watch URLs to artifact citations missing a link. */
export async function enrichArtifactCitationUrls<T extends EnrichableCitation>(
  supabase: SupabaseClient,
  userId: string,
  citations: T[],
): Promise<T[]> {
  const artifactIds = [
    ...new Set(
      citations
        .filter((c) => c.source_type === "artifact" && c.id && !c.url)
        .map((c) => c.id as string),
    ),
  ];
  if (!artifactIds.length) return citations;

  const { data } = await supabase
    .from("artifacts")
    .select("id, kind, url, metadata")
    .eq("user_id", userId)
    .in("id", artifactIds);

  const urlById = new Map<string, string>();
  for (const row of (data ?? []) as ArtifactUrlRow[]) {
    const watch = youtubeWatchUrlFromArtifact(row);
    if (watch) urlById.set(row.id, watch);
  }
  if (!urlById.size) return citations;

  return citations.map((c) => {
    if (c.source_type !== "artifact" || c.url || !c.id) return c;
    const url = urlById.get(c.id);
    return url ? { ...c, url } : c;
  });
}

export async function finalizeChatCitations<T extends EnrichableCitation>(
  supabase: SupabaseClient,
  userId: string,
  citations: T[],
  opts: { includeGeneral: boolean; usedWeb: boolean },
  retrievedCitations?: RetrievedCitation[],
): Promise<T[]> {
  const withoutMeta = citations.filter((c) => c.source_type !== "attribution");
  const merged = retrievedCitations?.length
    ? mergeRetrievedCitations(withoutMeta, retrievedCitations)
    : withoutMeta;
  const enriched = await enrichArtifactCitationUrls(supabase, userId, merged);
  return attachSourceAttribution(enriched, opts) as T[];
}
