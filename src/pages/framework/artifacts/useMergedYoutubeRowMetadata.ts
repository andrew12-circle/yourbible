import { useEffect, useMemo, useState } from "react";
import { getYouTubeVideoId } from "@/lib/youtube";
import type { ArtifactMetadata, Row } from "./artifactLibraryModel";
import { channelAndAuthorLine, trimStr } from "./artifactLibraryModel";

/** Session cache: oEmbed is CORS-open; old DB rows often lack channel/author until re-fetched server-side. */
const youtubeOembedListSessionCache = new Map<string, { author_name?: string; title?: string } | null>();
const youtubeOembedListInflight = new Map<string, Promise<{ author_name?: string; title?: string } | null>>();

export function canonicalYouTubePageUrl(videoId: string, artifactUrl: string | null | undefined): string {
  const u = typeof artifactUrl === "string" ? artifactUrl.trim() : "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function fetchYoutubeOembedForListRow(videoId: string, pageUrl: string): Promise<{ author_name?: string; title?: string } | null> {
  const hit = youtubeOembedListSessionCache.get(videoId);
  if (hit !== undefined) return Promise.resolve(hit);

  let p = youtubeOembedListInflight.get(videoId);
  if (!p) {
    p = fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`, { credentials: "omit" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { author_name?: string; title?: string } | null) => {
        const payload =
          json && (trimStr(json.author_name) || trimStr(json.title))
            ? { author_name: trimStr(json.author_name) ?? undefined, title: trimStr(json.title) ?? undefined }
            : null;
        youtubeOembedListSessionCache.set(videoId, payload);
        youtubeOembedListInflight.delete(videoId);
        return payload;
      })
      .catch(() => {
        youtubeOembedListSessionCache.set(videoId, null);
        youtubeOembedListInflight.delete(videoId);
        return null;
      });
    youtubeOembedListInflight.set(videoId, p);
  }
  return p;
}

/**
 * For YouTube list rows missing stored channel/author, merge live oEmbed (channel uploader in `author_name`).
 * Display-only; does not write to Supabase.
 */
export function useMergedYoutubeRowMetadata(r: Row): ArtifactMetadata | null | undefined {
  const m = r.metadata;
  const videoId = r.kind === "youtube" ? getYouTubeVideoId(r.url) : null;
  const hasChannelAuthor = Boolean(channelAndAuthorLine(m));
  const pageUrl = videoId ? canonicalYouTubePageUrl(videoId, r.url) : null;
  const needsOembed = r.kind === "youtube" && Boolean(videoId && pageUrl) && !hasChannelAuthor;

  const [oembed, setOembed] = useState<{ author_name?: string; title?: string } | null | undefined>(undefined);

  useEffect(() => {
    if (!needsOembed || !videoId || !pageUrl) {
      setOembed(undefined);
      return;
    }
    const cached = youtubeOembedListSessionCache.get(videoId);
    if (cached !== undefined) {
      setOembed(cached);
      return;
    }
    let cancelled = false;
    void fetchYoutubeOembedForListRow(videoId, pageUrl).then((payload) => {
      if (!cancelled) setOembed(payload);
    });
    return () => {
      cancelled = true;
    };
  }, [needsOembed, videoId, pageUrl]);

  return useMemo(() => {
    if (!needsOembed || oembed === undefined) return m;
    const authorFromOembed = trimStr(oembed?.author_name);
    const titleFromOembed = trimStr(oembed?.title);
    if (!authorFromOembed && !titleFromOembed) return m;
    return {
      ...(m ?? {}),
      ...(authorFromOembed
        ? {
            channel_title:
              trimStr(m?.channel_title) ??
              trimStr(m?.channel) ??
              trimStr(m?.channelTitle) ??
              trimStr(m?.publisher) ??
              authorFromOembed,
            author_name: trimStr(m?.author_name) ?? trimStr(m?.author) ?? authorFromOembed,
          }
        : {}),
      ...(titleFromOembed && !trimStr(m?.title) ? { title: titleFromOembed } : {}),
    };
  }, [m, needsOembed, oembed]);
}
