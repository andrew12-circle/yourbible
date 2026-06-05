import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { titleLooksBad } from "@/lib/framework/artifactDetailPageHelpers";

export interface ArtifactYoutubeLiveMeta {
  source?: string;
  channel_title?: string | null;
  channel_url?: string | null;
  channel_thumbnail_url?: string | null;
  author_name?: string | null;
  author?: string | null;
  thumbnail_url?: string | null;
  provider_name?: string | null;
  duration_seconds?: number | null;
  title?: string;
  youtube_chapters?: unknown;
  youtube_chapters_source?: string | null;
  video_id?: string;
}

async function fetchYouTubeOembedMeta(videoUrl: string): Promise<ArtifactYoutubeLiveMeta | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
      provider_name?: string;
    };
    return {
      source: "youtube",
      channel_title: json.author_name ?? null,
      channel_url: json.author_url ?? null,
      thumbnail_url: json.thumbnail_url ?? null,
      provider_name: json.provider_name ?? "YouTube",
      title: json.title ?? undefined,
    };
  } catch {
    return null;
  }
}

async function fetchYouTubeChannelAvatar(artifactId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("framework-youtube-channel-avatar", {
      body: { artifact_id: artifactId },
    });
    if (error) return null;
    const url = (data as { channel_thumbnail_url?: string | null } | null)?.channel_thumbnail_url;
    return typeof url === "string" && url.trim() ? url.trim() : null;
  } catch {
    return null;
  }
}

export function useArtifactYoutubeMetaRepair(
  a: ArtifactRow | null,
  setA: Dispatch<SetStateAction<ArtifactRow | null>>,
) {
  const [liveMeta, setLiveMeta] = useState<ArtifactYoutubeLiveMeta | null>(null);
  const repairedRef = useRef(false);

  const fetchYouTubeMeta = useCallback(async (videoUrl: string) => fetchYouTubeOembedMeta(videoUrl), []);

  useEffect(() => {
    if (!a || a.kind !== "youtube" || !a.url) return;
    if (liveMeta || repairedRef.current) return;
    let cancelled = false;
    (async () => {
      const meta = await fetchYouTubeMeta(a.url!);
      if (cancelled || !meta) return;

      const prev = (a.metadata ?? {}) as Record<string, unknown>;
      const existingChannelThumb =
        typeof prev.channel_thumbnail_url === "string" ? prev.channel_thumbnail_url.trim() : "";
      let channel_thumbnail_url = existingChannelThumb || null;
      if (!channel_thumbnail_url) {
        channel_thumbnail_url = await fetchYouTubeChannelAvatar(a.id);
      }

      const enrichedMeta = {
        ...meta,
        ...(channel_thumbnail_url ? { channel_thumbnail_url } : {}),
      };
      setLiveMeta(enrichedMeta);

      const shouldFixTitle = !!meta.title && titleLooksBad(a.title) && a.title?.trim() !== meta.title.trim();
      const updatePatch: Record<string, unknown> = {};
      if (shouldFixTitle && meta.title) updatePatch.title = meta.title;

      const dbMeta = {
        ...prev,
        source: "youtube",
        channel_title: enrichedMeta.channel_title ?? null,
        channel_url: enrichedMeta.channel_url ?? null,
        channel_thumbnail_url: enrichedMeta.channel_thumbnail_url ?? null,
        thumbnail_url: enrichedMeta.thumbnail_url ?? null,
        provider_name: enrichedMeta.provider_name ?? "YouTube",
      };

      const tryWithMetadata = await supabase
        .from("artifacts")
        .update({ ...updatePatch, metadata: dbMeta })
        .eq("id", a.id);
      if (tryWithMetadata.error && Object.keys(updatePatch).length > 0) {
        await supabase.from("artifacts").update(updatePatch as never).eq("id", a.id);
      }

      repairedRef.current = true;
      if (shouldFixTitle && meta.title) {
        setA((prev) => (prev ? { ...prev, title: meta.title ?? prev.title } : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [a, fetchYouTubeMeta, liveMeta, setA]);

  return { liveMeta, setLiveMeta, fetchYouTubeMeta, repairedRef };
}
