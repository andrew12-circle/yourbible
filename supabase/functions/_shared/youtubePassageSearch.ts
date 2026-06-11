const VIDEO_ID_RE = /^[\w-]{11}$/;

export type PassageYouTubeSource = {
  kind: "youtube";
  title: string;
  url: string;
  snippet?: string;
  view_count?: number;
};

function apiKey(): string | null {
  return Deno.env.get("YOUTUBE_DATA_API_KEY")?.trim() || null;
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id && VIDEO_ID_RE.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && VIDEO_ID_RE.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1] && VIDEO_ID_RE.test(parts[1])) return parts[1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

type VideoHit = {
  videoId: string;
  title: string;
  url: string;
  channelTitle: string;
  description: string;
  viewCount: number | null;
};

async function fetchVideoStats(videoIds: string[], key: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!videoIds.length) return out;
  const u = new URL("https://www.googleapis.com/youtube/v3/videos");
  u.searchParams.set("part", "statistics");
  u.searchParams.set("id", videoIds.slice(0, 50).join(","));
  u.searchParams.set("key", key);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return out;
  const json = await res.json() as {
    items?: Array<{ id?: string; statistics?: { viewCount?: string } }>;
  };
  for (const item of json.items ?? []) {
    const id = item.id?.trim();
    const raw = item.statistics?.viewCount;
    if (!id || !raw) continue;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) out.set(id, n);
  }
  return out;
}

async function searchYouTubeQuery(query: string, key: string, maxResults: number): Promise<VideoHit[]> {
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("type", "video");
  u.searchParams.set("order", "viewCount");
  u.searchParams.set("q", query.trim().slice(0, 200));
  u.searchParams.set("maxResults", String(Math.min(Math.max(maxResults, 1), 25)));
  u.searchParams.set("key", key);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const json = await res.json() as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        channelTitle?: string;
      };
    }>;
  };
  const hits: VideoHit[] = [];
  for (const item of json.items ?? []) {
    const videoId = item.id?.videoId?.trim();
    if (!videoId || !VIDEO_ID_RE.test(videoId)) continue;
    const title = item.snippet?.title?.trim() || "YouTube video";
    hits.push({
      videoId,
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      channelTitle: item.snippet?.channelTitle?.trim() || "",
      description: item.snippet?.description?.trim() || "",
      viewCount: null,
    });
  }
  if (!hits.length) return hits;
  const stats = await fetchVideoStats(hits.map((h) => h.videoId), key);
  for (const h of hits) {
    const vc = stats.get(h.videoId);
    if (vc != null) h.viewCount = vc;
  }
  return hits;
}

export function youtubeVideoIdFromUrl(url: string): string | null {
  return extractVideoId(url);
}

/** Search YouTube for passage-related videos, sorted by view count when the API key is set. */
export async function searchPassageYouTubeVideos(
  passageRef: string,
  opts?: { userQuestion?: string; maxPerQuery?: number },
): Promise<{ sources: PassageYouTubeSource[]; usedApi: boolean; queries: string[] }> {
  const key = apiKey();
  if (!key) return { sources: [], usedApi: false, queries: [] };

  const ref = passageRef.trim();
  const extra = opts?.userQuestion?.trim().slice(0, 80) ?? "";
  const perQuery = opts?.maxPerQuery ?? 8;
  const queries = [
    `${ref} sermon Bible`,
    `${ref} Bible study teaching`,
    extra ? `${ref} ${extra}` : `${ref} commentary theology`,
  ];

  const seen = new Set<string>();
  const hits: VideoHit[] = [];
  for (const q of queries) {
    const batch = await searchYouTubeQuery(q, key, perQuery);
    for (const h of batch) {
      if (seen.has(h.videoId)) continue;
      seen.add(h.videoId);
      hits.push(h);
    }
    if (hits.length >= 20) break;
  }

  hits.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));

  const sources: PassageYouTubeSource[] = hits.map((h) => {
    const snippet = h.channelTitle
      ? h.channelTitle
      : h.description.slice(0, 160) || undefined;
    return {
      kind: "youtube" as const,
      title: h.title,
      url: h.url,
      snippet,
      view_count: h.viewCount ?? undefined,
    };
  });

  return { sources, usedApi: sources.length > 0, queries };
}
