/** Parse Spotify / Apple Music / YouTube links into embeddable praise-music players. */

import { newId, type WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";

export type WorshipMusicProvider = "spotify" | "apple" | "youtube";

export interface WorshipMusicEmbed {
  provider: WorshipMusicProvider;
  embedUrl: string;
  openUrl: string;
  label: string;
}

const PROVIDER_LABELS: Record<WorshipMusicProvider, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube",
};

function spotifyEmbed(type: string, id: string, openUrl: string): WorshipMusicEmbed {
  return {
    provider: "spotify",
    embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    openUrl,
    label: PROVIDER_LABELS.spotify,
  };
}

function appleEmbed(path: string, openUrl: string): WorshipMusicEmbed {
  return {
    provider: "apple",
    embedUrl: `https://embed.music.apple.com/${path}`,
    openUrl,
    label: PROVIDER_LABELS.apple,
  };
}

function youtubeEmbed(embedUrl: string, openUrl: string): WorshipMusicEmbed {
  return {
    provider: "youtube",
    embedUrl,
    openUrl,
    label: PROVIDER_LABELS.youtube,
  };
}

/** Turn a share link (or existing embed URL) into an iframe-ready player config. */
export function parseWorshipMusicUrl(input: string): WorshipMusicEmbed | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "open.spotify.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const type = parts[0];
      const id = parts[1]?.split("?")[0];
      if (type && id && ["playlist", "album", "track", "artist", "episode", "show"].includes(type)) {
        return spotifyEmbed(type, id, `https://open.spotify.com/${type}/${id}`);
      }
    }

    if (host === "embed.music.apple.com") {
      const path = url.pathname.replace(/^\//, "") + url.search;
      const openPath = path.replace(/^embed\./, "");
      return appleEmbed(path, `https://music.apple.com/${openPath}`);
    }

    if (host === "music.apple.com") {
      const path = url.pathname.replace(/^\//, "") + url.search;
      return appleEmbed(path, url.toString());
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const listId = url.searchParams.get("list");
      const videoId = url.searchParams.get("v");
      if (url.pathname === "/playlist" && listId) {
        return youtubeEmbed(
          `https://www.youtube.com/embed/videoseries?list=${listId}`,
          `https://www.youtube.com/playlist?list=${listId}`,
        );
      }
      if (videoId) {
        const embed = listId
          ? `https://www.youtube.com/embed/${videoId}?list=${listId}`
          : `https://www.youtube.com/embed/${videoId}`;
        return youtubeEmbed(embed, url.toString());
      }
    }

    if (host === "youtu.be") {
      const videoId = url.pathname.replace(/^\//, "").split("/")[0];
      if (videoId) {
        return youtubeEmbed(
          `https://www.youtube.com/embed/${videoId}`,
          `https://www.youtube.com/watch?v=${videoId}`,
        );
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function worshipMusicEmbedHeight(provider: WorshipMusicProvider): number {
  switch (provider) {
    case "spotify":
      return 152;
    case "apple":
      return 175;
    case "youtube":
      return 360;
  }
}

/** Tailwind classes for the worship embed shell — YouTube gets a wide 16:9 stage. */
export function worshipMusicEmbedShellClass(provider: WorshipMusicProvider): string {
  if (provider === "youtube") {
    return "relative w-full aspect-video min-h-[220px] max-h-[min(56vw,420px)]";
  }
  return "w-full";
}

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return url.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export function worshipMusicFallbackThumbnail(url: string, provider: WorshipMusicProvider): string | null {
  if (provider !== "youtube") return null;
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null;
}

function normalizeWorshipMusicUrl(url: string): string {
  const parsed = parseWorshipMusicUrl(url);
  return parsed?.openUrl ?? url.trim();
}

/** Add or bump a worship link in saved history (deduped by normalized open URL). */
export function upsertWorshipMusicHistory(
  history: WorshipMusicHistoryItem[],
  url: string,
): WorshipMusicHistoryItem[] {
  const parsed = parseWorshipMusicUrl(url);
  if (!parsed) return history;

  const normalized = normalizeWorshipMusicUrl(url);
  const existing = history.find((item) => normalizeWorshipMusicUrl(item.url) === normalized);
  const nextItem: WorshipMusicHistoryItem = existing
    ? {
        ...existing,
        url: parsed.openUrl,
        provider: parsed.provider,
        added_at: new Date().toISOString(),
        thumbnail_url:
          existing.thumbnail_url ?? worshipMusicFallbackThumbnail(parsed.openUrl, parsed.provider) ?? undefined,
      }
    : {
        id: newId(),
        url: parsed.openUrl,
        provider: parsed.provider,
        added_at: new Date().toISOString(),
        thumbnail_url: worshipMusicFallbackThumbnail(parsed.openUrl, parsed.provider) ?? undefined,
      };

  const rest = history.filter((item) => normalizeWorshipMusicUrl(item.url) !== normalized);
  return [nextItem, ...rest].slice(0, 12);
}

export type WorshipMusicOEmbed = {
  title?: string;
  thumbnailUrl?: string;
};

/** Best-effort title + artwork from provider oEmbed endpoints. */
export async function fetchWorshipMusicOEmbed(url: string): Promise<WorshipMusicOEmbed> {
  const parsed = parseWorshipMusicUrl(url);
  if (!parsed) return {};

  const fallbackThumb = worshipMusicFallbackThumbnail(parsed.openUrl, parsed.provider);
  if (parsed.provider === "apple") {
    return { thumbnailUrl: fallbackThumb ?? undefined };
  }

  const oembedUrl =
    parsed.provider === "spotify"
      ? `https://open.spotify.com/oembed?url=${encodeURIComponent(parsed.openUrl)}`
      : `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.openUrl)}&format=json`;

  try {
    const res = await fetch(oembedUrl);
    if (!res.ok) return { thumbnailUrl: fallbackThumb ?? undefined };
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    return {
      title: data.title?.trim() || undefined,
      thumbnailUrl: data.thumbnail_url?.trim() || fallbackThumb || undefined,
    };
  } catch {
    return { thumbnailUrl: fallbackThumb ?? undefined };
  }
}

export function mergeWorshipHistoryMetadata(
  history: WorshipMusicHistoryItem[],
  url: string,
  metadata: WorshipMusicOEmbed,
): WorshipMusicHistoryItem[] {
  const normalized = normalizeWorshipMusicUrl(url);
  return history.map((item) => {
    if (normalizeWorshipMusicUrl(item.url) !== normalized) return item;
    return {
      ...item,
      title: metadata.title ?? item.title,
      thumbnail_url: metadata.thumbnailUrl ?? item.thumbnail_url,
    };
  });
}

export const WORSHIP_MUSIC_HINT =
  "Paste a Spotify, Apple Music, or YouTube playlist link — it plays here during worship.";
