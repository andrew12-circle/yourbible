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

type EmbedMessage = {
  event?: string;
  info?: number | { currentTime?: number; playerState?: number };
};

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
