import { safeWidgetReferrer, youtubeHostOrigin, youtubeNeedsHostedPlayer, YOUTUBE_PLAYER_BRIDGE_PATH } from "./hostOrigin";
import { sendYouTubeFrameMessage } from "./embedMessaging";
import { youtubeDocumentPipWindowRef } from "@/lib/youtube/documentPictureInPicture";

export type YouTubeEmbedSrcOptions = {
  startSeconds?: number;
  autoplay?: boolean;
  mute?: boolean;
  /** Live broadcast — omit start seek so the embed stays at the live edge. */
  liveEdge?: boolean;
  /** Embed origin — defaults to the opener page origin. */
  origin?: string;
  /** Page URL YouTube uses for embed referrer validation (fixes error 153). */
  widgetReferrer?: string;
  /** HTTPS document supplies a real Referer for WebViews or a single Error 153 retry. */
  hosted?: boolean;
};

/** Standard YouTube embed URL for in-slot iframe; enablejsapi allows commands via postMessage. */
export function buildYouTubeEmbedSrc(
  videoId: string,
  startSeconds = 0,
  options?: YouTubeEmbedSrcOptions,
): string {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) throw new Error("Invalid YouTube video ID.");
  const liveEdge = Boolean(options?.liveEdge);
  const requestedStart = options?.startSeconds ?? startSeconds;
  const start = liveEdge || !Number.isFinite(requestedStart) ? 0 : Math.max(0, Math.floor(requestedStart));
  const autoplay = options?.autoplay ? "1" : "0";
  const mute = options?.mute ? "1" : "0";
  const params = new URLSearchParams({
    autoplay,
    mute,
    controls: "1",
    enablejsapi: "1",
    fs: "1",
    iv_load_policy: "3",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
  });
  if (!liveEdge && start > 0) params.set("start", String(start));
  const origin = youtubeHostOrigin(options?.origin);
  params.set("origin", origin);
  params.set("widget_referrer", safeWidgetReferrer(options?.widgetReferrer, origin + "/"));
  if (options?.hosted || youtubeNeedsHostedPlayer(options?.origin)) {
    params.set("v", videoId);
    const parentOrigin = options?.origin ?? (typeof window !== "undefined" ? window.location.origin : origin);
    params.set("parent_origin", parentOrigin);
    return `${origin}${YOUTUBE_PLAYER_BRIDGE_PATH}?${params.toString()}`;
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export type YouTubeEmbedCommand = "playVideo" | "pauseVideo" | "seekTo" | "mute" | "unMute";

export function getStaticYouTubeEmbedIframe(
  videoSlot: HTMLElement | null,
): HTMLIFrameElement | null {
  const selector = "iframe[data-youtube-static-embed]";

  const pipWindow = youtubeDocumentPipWindowRef.current;
  if (pipWindow && !pipWindow.closed) {
    const inPip = pipWindow.document.querySelector(selector);
    if (inPip instanceof HTMLIFrameElement) return inPip;
  }

  const inSlot = videoSlot?.querySelector(selector);
  if (inSlot instanceof HTMLIFrameElement) return inSlot;

  return null;
}

/** Send play/pause/seek to the in-page static YouTube embed (requires enablejsapi=1). */
export function postYouTubeEmbedCommand(
  iframe: HTMLIFrameElement | null,
  func: YouTubeEmbedCommand,
  args: number[] = [],
): void {
  if (!iframe?.contentWindow) return;
  try {
    sendYouTubeFrameMessage(iframe, { event: "command", func, args });
  } catch {
    /* ignore */
  }
}
