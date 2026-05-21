/** YouTube embed postMessage state codes (iframe API). */
export const YT_EMBED_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export function isYouTubeEmbedMessageOrigin(origin: string): boolean {
  return origin === "https://www.youtube.com" || origin === "https://www.youtube-nocookie.com";
}

type EmbedInfo = {
  currentTime?: number;
  playerState?: number;
  videoData?: { currentTime?: number };
};

type EmbedMessage = {
  event?: string;
  info?: number | EmbedInfo;
};

export function currentTimeFromEmbedInfo(info: EmbedInfo | undefined): number | null {
  if (!info || typeof info !== "object") return null;
  if (typeof info.currentTime === "number" && Number.isFinite(info.currentTime)) return info.currentTime;
  const fromVideoData = info.videoData?.currentTime;
  if (typeof fromVideoData === "number" && Number.isFinite(fromVideoData)) return fromVideoData;
  return null;
}

export function parseYouTubeEmbedMessage(data: unknown): EmbedMessage | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as EmbedMessage;
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object") return data as EmbedMessage;
  return null;
}

export function embedStateIsPlaying(state: number | undefined): boolean {
  return state === YT_EMBED_STATE.PLAYING || state === YT_EMBED_STATE.BUFFERING;
}
