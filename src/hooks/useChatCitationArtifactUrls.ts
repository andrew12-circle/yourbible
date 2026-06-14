import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeVideoId, metadataYouTubeVideoId } from "@/lib/youtube";
import type { ChatCitation } from "@/lib/myai/parseChatCitations";

function youtubeWatchUrl(url: string | null, metadata: unknown): string | null {
  const stored = url?.trim() ?? "";
  const videoId = getYouTubeVideoId(stored) ?? metadataYouTubeVideoId(metadata);
  if (videoId) return stored && getYouTubeVideoId(stored) === videoId ? stored.split("#")[0]! : `https://www.youtube.com/watch?v=${videoId}`;
  return stored || null;
}

/** Backfill YouTube watch URLs for artifact citations saved before url enrichment. */
export function useChatCitationArtifactUrls(citations: ChatCitation[]): Record<string, string> {
  const missingIds = useMemo(
    () =>
      [
        ...new Set(
          citations
            .filter((c) => c.source_type === "artifact" && c.id && !c.url)
            .map((c) => c.id as string),
        ),
      ],
    [citations],
  );
  const missingKey = missingIds.join(",");
  const [urlById, setUrlById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!missingIds.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("artifacts")
        .select("id, kind, url, metadata")
        .in("id", missingIds);
      if (cancelled || !data?.length) return;
      const next: Record<string, string> = {};
      for (const row of data) {
        if (row.kind !== "youtube") continue;
        const watch = youtubeWatchUrl(row.url, row.metadata);
        if (watch) next[row.id] = watch;
      }
      if (Object.keys(next).length) {
        setUrlById((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missingKey, missingIds]);

  return urlById;
}
