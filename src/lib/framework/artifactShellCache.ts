import type { Json } from "@/integrations/supabase/types";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { getYouTubeVideoId } from "@/lib/youtube";
import { warmYouTubeEmbed, warmYouTubeEmbedFromUrl, warmYouTubeIframeApi } from "@/lib/youtube/warmEmbed";

export type ArtifactShellSeed = {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  url?: string | null;
  metadata?: Json | null;
  created_at?: string | null;
};

const MAX_ENTRIES = 24;
const cache = new Map<string, ArtifactRow>();

function metadataVideoId(metadata: Json | null | undefined): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).video_id;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function artifactShellFromSeed(seed: ArtifactShellSeed): ArtifactRow {
  return {
    id: seed.id,
    title: seed.title,
    kind: seed.kind,
    status: seed.status,
    error: null,
    raw_text: "",
    url: seed.url ?? null,
    metadata: seed.metadata ?? null,
    created_at: seed.created_at ?? null,
  };
}

export function seedArtifactShellCache(seed: ArtifactShellSeed): void {
  if (!seed.id) return;
  if (cache.has(seed.id)) cache.delete(seed.id);
  cache.set(seed.id, artifactShellFromSeed(seed));
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

export function peekArtifactShellCache(artifactId: string | undefined): ArtifactRow | null {
  if (!artifactId) return null;
  return cache.get(artifactId) ?? null;
}

/** Seed shell + warm YouTube assets before navigating to artifact detail. */
export function prepareArtifactNavigation(seed: ArtifactShellSeed): void {
  seedArtifactShellCache(seed);
  if (seed.kind !== "youtube") return;
  warmYouTubeIframeApi();
  const videoId = getYouTubeVideoId(seed.url) ?? metadataVideoId(seed.metadata);
  if (videoId) warmYouTubeEmbed(videoId);
  else warmYouTubeEmbedFromUrl(seed.url);
}
