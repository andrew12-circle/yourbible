type ChannelThumbnails = {
  high?: { url?: string };
  medium?: { url?: string };
  default?: { url?: string };
};

function decodeYoutubeEscapedUrl(url: string): string {
  return url.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
}

export async function fetchChannelThumbnailViaDataApi(videoId: string): Promise<string | null> {
  const key = Deno.env.get("YOUTUBE_DATA_API_KEY");
  if (!key || !videoId) return null;

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet");
  videosUrl.searchParams.set("id", videoId);
  videosUrl.searchParams.set("key", key);
  const videosRes = await fetch(videosUrl.toString(), { headers: { Accept: "application/json" } });
  if (!videosRes.ok) return null;

  const videosJson = await videosRes.json() as { items?: Array<{ snippet?: { channelId?: string } }> };
  const channelId = videosJson.items?.[0]?.snippet?.channelId;
  if (!channelId) return null;

  const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelsUrl.searchParams.set("part", "snippet");
  channelsUrl.searchParams.set("id", channelId);
  channelsUrl.searchParams.set("key", key);
  const channelsRes = await fetch(channelsUrl.toString(), { headers: { Accept: "application/json" } });
  if (!channelsRes.ok) return null;

  const channelsJson = await channelsRes.json() as { items?: Array<{ snippet?: { thumbnails?: ChannelThumbnails } }> };
  const thumbs = channelsJson.items?.[0]?.snippet?.thumbnails;
  return thumbs?.high?.url ?? thumbs?.medium?.url ?? thumbs?.default?.url ?? null;
}

export function extractChannelThumbnailFromWatchHtml(html: string): string | null {
  const ownerMatch = html.match(
    /"videoOwnerRenderer":\{[\s\S]*?"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/,
  );
  if (ownerMatch?.[1]) return decodeYoutubeEscapedUrl(ownerMatch[1]);

  const channelIdMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
  if (channelIdMatch) {
    const idx = html.indexOf(channelIdMatch[0]);
    const slice = html.slice(idx, idx + 8000);
    const avatarMatch = slice.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/);
    if (avatarMatch?.[1]) return decodeYoutubeEscapedUrl(avatarMatch[1]);
  }

  return null;
}

export async function fetchChannelThumbnailFromChannelPage(channelUrl: string): Promise<string | null> {
  const res = await fetch(channelUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; YourBible/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const html = await res.text();
  const og = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
  return og?.trim() || null;
}

export async function resolveYouTubeChannelThumbnail(input: {
  videoId?: string | null;
  channelUrl?: string | null;
  watchHtml?: string | null;
}): Promise<string | null> {
  const { videoId, channelUrl, watchHtml } = input;

  if (videoId) {
    const fromApi = await fetchChannelThumbnailViaDataApi(videoId).catch(() => null);
    if (fromApi) return fromApi;
  }

  if (watchHtml) {
    const fromHtml = extractChannelThumbnailFromWatchHtml(watchHtml);
    if (fromHtml) return fromHtml;
  }

  if (channelUrl?.trim()) {
    return fetchChannelThumbnailFromChannelPage(channelUrl.trim()).catch(() => null);
  }

  return null;
}
