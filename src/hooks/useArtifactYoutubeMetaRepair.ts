import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import { titleLooksBad } from "@/lib/framework/artifactDetailPageHelpers";

export interface ArtifactYoutubeLiveMeta {
  source?: string;
  channel_title?: string | null;
  channel_url?: string | null;
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

export function useArtifactYoutubeMetaRepair(
  a: ArtifactRow | null,
  setA: React.Dispatch<React.SetStateAction<ArtifactRow | null>>,
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
      setLiveMeta(meta);

      const shouldFixTitle = !!meta.title && titleLooksBad(a.title) && a.title?.trim() !== meta.title.trim();
      const updatePatch: Record<string, unknown> = {};
      if (shouldFixTitle && meta.title) updatePatch.title = meta.title;

      const prev = (a.metadata ?? {}) as Record<string, unknown>;
      const dbMeta = {
        ...prev,
        source: "youtube",
        channel_title: meta.channel_title ?? null,
        channel_url: meta.channel_url ?? null,
        thumbnail_url: meta.thumbnail_url ?? null,
        provider_name: meta.provider_name ?? "YouTube",
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
