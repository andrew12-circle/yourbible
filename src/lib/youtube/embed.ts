import { youtubeDocumentPipWindowRef } from "@/lib/youtube/documentPictureInPicture";

export type YouTubeEmbedSrcOptions = {
  startSeconds?: number;
  autoplay?: boolean;
};

/** Standard YouTube embed URL for in-slot iframe; enablejsapi allows commands via postMessage. */
export function buildYouTubeEmbedSrc(
  videoId: string,
  startSeconds = 0,
  options?: YouTubeEmbedSrcOptions,
): string {
  const start = Math.max(0, Math.floor(options?.startSeconds ?? startSeconds));
  const autoplay = options?.autoplay ? "1" : "0";
  const params = new URLSearchParams({
    autoplay,
    controls: "1",
    enablejsapi: "1",
    fs: "1",
    iv_load_policy: "3",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
  });
  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }
  if (start > 0) params.set("start", String(start));
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export type YouTubeEmbedCommand = "playVideo" | "pauseVideo" | "seekTo";

export function getStaticYouTubeEmbedIframe(
  videoSlot: HTMLElement | null,
): HTMLIFrameElement | null {
  const selector = "iframe[data-youtube-static-embed]";
  const inSlot = videoSlot?.querySelector(selector);
  if (inSlot instanceof HTMLIFrameElement) return inSlot;

  const pipWindow = youtubeDocumentPipWindowRef.current;
  if (pipWindow && !pipWindow.closed) {
    const inPip = pipWindow.document.querySelector(selector);
    if (inPip instanceof HTMLIFrameElement) return inPip;
  }

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
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube.com",
    );
  } catch {
    /* ignore */
  }
}
