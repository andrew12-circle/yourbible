const CHANNEL_ID_RE = /^UC[\w-]{22}$/;

export type ResolvedYouTubeChannel = {
  channelId: string;
  title: string;
  thumbnailUrl: string | null;
  handle: string | null;
  uploadsPlaylistId: string;
};

export type YouTubeChannelVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  url: string;
};

type ChannelSnippet = {
  title?: string;
  customUrl?: string;
  thumbnails?: {
    high?: { url?: string };
    medium?: { url?: string };
    default?: { url?: string };
  };
};

type ChannelContentDetails = {
  relatedPlaylists?: { uploads?: string };
};

function apiKey(): string | null {
  return Deno.env.get("YOUTUBE_DATA_API_KEY")?.trim() || null;
}

function thumbFromSnippet(snippet?: ChannelSnippet): string | null {
  const t = snippet?.thumbnails;
  return t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? null;
}

export function uploadsPlaylistIdForChannel(channelId: string): string {
  if (channelId.startsWith("UC")) return `UU${channelId.slice(2)}`;
  return channelId;
}

export function parseChannelInput(raw: string): { channelId?: string; handle?: string } {
  const trimmed = raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!trimmed) return {};
  if (CHANNEL_ID_RE.test(trimmed)) return { channelId: trimmed };

  let s = trimmed;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "m.youtube.com") return {};
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1] && CHANNEL_ID_RE.test(parts[1])) {
      return { channelId: parts[1] };
    }
    if (parts[0]?.startsWith("@")) return { handle: parts[0].slice(1) };
    if (parts[0] === "@" && parts[1]) return { handle: parts[1] };
  } catch {
    /* fall through */
  }

  if (trimmed.startsWith("@")) return { handle: trimmed.slice(1) };
  if (/^[\w.-]{2,}$/.test(trimmed) && !trimmed.includes(" ")) return { handle: trimmed };
  return {};
}

async function fetchChannelById(channelId: string, key: string): Promise<ResolvedYouTubeChannel | null> {
  const u = new URL("https://www.googleapis.com/youtube/v3/channels");
  u.searchParams.set("part", "snippet,contentDetails");
  u.searchParams.set("id", channelId);
  u.searchParams.set("key", key);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = await res.json() as {
    items?: Array<{
      id?: string;
      snippet?: ChannelSnippet;
      contentDetails?: ChannelContentDetails;
    }>;
  };
  const item = json.items?.[0];
  if (!item?.id) return null;
  const uploads = item.contentDetails?.relatedPlaylists?.uploads
    ?? uploadsPlaylistIdForChannel(item.id);
  const handle = item.snippet?.customUrl?.replace(/^\//, "").replace(/^@/, "") ?? null;
  return {
    channelId: item.id,
    title: item.snippet?.title?.trim() || "YouTube channel",
    thumbnailUrl: thumbFromSnippet(item.snippet),
    handle,
    uploadsPlaylistId: uploads,
  };
}

async function fetchChannelByHandle(handle: string, key: string): Promise<ResolvedYouTubeChannel | null> {
  const u = new URL("https://www.googleapis.com/youtube/v3/channels");
  u.searchParams.set("part", "snippet,contentDetails");
  u.searchParams.set("forHandle", handle.replace(/^@/, ""));
  u.searchParams.set("key", key);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = await res.json() as {
    items?: Array<{
      id?: string;
      snippet?: ChannelSnippet;
      contentDetails?: ChannelContentDetails;
    }>;
  };
  const item = json.items?.[0];
  if (!item?.id) return null;
  const uploads = item.contentDetails?.relatedPlaylists?.uploads
    ?? uploadsPlaylistIdForChannel(item.id);
  return {
    channelId: item.id,
    title: item.snippet?.title?.trim() || "YouTube channel",
    thumbnailUrl: thumbFromSnippet(item.snippet),
    handle: handle.replace(/^@/, ""),
    uploadsPlaylistId: uploads,
  };
}

export async function resolveYouTubeChannel(input: string): Promise<ResolvedYouTubeChannel | null> {
  const key = apiKey();
  if (!key) throw new Error("YOUTUBE_DATA_API_KEY is not configured on the server.");

  const parsed = parseChannelInput(input);
  if (parsed.channelId) return fetchChannelById(parsed.channelId, key);
  if (parsed.handle) return fetchChannelByHandle(parsed.handle, key);
  return null;
}

export async function fetchChannelUploads(
  uploadsPlaylistId: string,
  opts?: { sinceIso?: string | null; maxResults?: number },
): Promise<YouTubeChannelVideo[]> {
  const key = apiKey();
  if (!key) throw new Error("YOUTUBE_DATA_API_KEY is not configured on the server.");

  const maxResults = Math.min(Math.max(opts?.maxResults ?? 15, 1), 50);
  const sinceMs = opts?.sinceIso ? Date.parse(opts.sinceIso) : null;

  const u = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  u.searchParams.set("part", "snippet,contentDetails");
  u.searchParams.set("playlistId", uploadsPlaylistId);
  u.searchParams.set("maxResults", String(maxResults));
  u.searchParams.set("key", key);

  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YouTube playlistItems failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json() as {
    items?: Array<{
      contentDetails?: { videoId?: string };
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  };

  const videos: YouTubeChannelVideo[] = [];
  for (const item of json.items ?? []) {
    const videoId = item.contentDetails?.videoId?.trim();
    if (!videoId) continue;
    const publishedAt = item.snippet?.publishedAt?.trim();
    if (!publishedAt) continue;
    if (sinceMs != null && Number.isFinite(sinceMs) && Date.parse(publishedAt) <= sinceMs) continue;
    const thumbs = item.snippet?.thumbnails;
    videos.push({
      videoId,
      title: item.snippet?.title?.trim() || "YouTube video",
      publishedAt,
      thumbnailUrl: thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? null,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }
  return videos;
}

export async function latestChannelUpload(
  uploadsPlaylistId: string,
): Promise<YouTubeChannelVideo | null> {
  const list = await fetchChannelUploads(uploadsPlaylistId, { maxResults: 1 });
  return list[0] ?? null;
}
