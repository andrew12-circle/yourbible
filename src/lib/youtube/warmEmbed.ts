import { getYouTubeVideoId } from "@/lib/youtube";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";
import { loadYouTubeIframeApi } from "@/lib/youtube/iframeApi";

const warmedVideoIds = new Set<string>();
const warmIframes = new Map<string, HTMLIFrameElement>();

const WARM_IFRAME_TTL_MS = 60_000;

function scheduleWarmIframeRemoval(videoId: string, iframe: HTMLIFrameElement): void {
  window.setTimeout(() => {
    if (warmIframes.get(videoId) === iframe) {
      iframe.remove();
      warmIframes.delete(videoId);
      warmedVideoIds.delete(videoId);
    }
  }, WARM_IFRAME_TTL_MS);
}

/** Hidden iframe prefetch so the real embed hits warm DNS/TLS/player assets. */
export function warmYouTubeEmbed(videoId: string | null | undefined): void {
  if (typeof document === "undefined" || !videoId?.trim()) return;
  const id = videoId.trim();
  if (warmedVideoIds.has(id)) return;
  warmedVideoIds.add(id);

  const iframe = document.createElement("iframe");
  iframe.src = buildYouTubeEmbedSrc(id);
  iframe.title = "";
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");
  iframe.style.cssText =
    "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;visibility:hidden";
  document.body.appendChild(iframe);
  warmIframes.set(id, iframe);
  iframe.addEventListener("load", () => scheduleWarmIframeRemoval(id, iframe), { once: true });
}

export function warmYouTubeEmbedFromUrl(url?: string | null): void {
  warmYouTubeEmbed(getYouTubeVideoId(url));
}

/** Call on library routes so API-player seeks are ready sooner. */
export function warmYouTubeIframeApi(): void {
  void loadYouTubeIframeApi();
}
