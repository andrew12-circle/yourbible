import { httpOrigin, YOUTUBE_PLAYER_BRIDGE_PATH } from "./hostOrigin";

export function youtubeFrameTargetOrigin(iframe: HTMLIFrameElement | null): string | null {
  if (!iframe) return null;
  try {
    const url = new URL(iframe.src);
    if (url.origin === "https://www.youtube.com" || url.origin === "https://www.youtube-nocookie.com") return url.origin;
    if (url.pathname === YOUTUBE_PLAYER_BRIDGE_PATH && httpOrigin(url.origin)) return url.origin;
  } catch { /* Not an identified player document. */ }
  return null;
}

export function isMessageFromYouTubeFrame(event: Pick<MessageEvent, "origin" | "source">, iframe: HTMLIFrameElement | null): boolean {
  const origin = youtubeFrameTargetOrigin(iframe);
  return Boolean(origin && iframe?.contentWindow && event.source === iframe.contentWindow && event.origin === origin);
}

export function sendYouTubeFrameMessage(iframe: HTMLIFrameElement | null, message: object): void {
  const origin = youtubeFrameTargetOrigin(iframe);
  if (!origin || !iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify(message), origin);
}
