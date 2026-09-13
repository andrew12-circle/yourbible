import { Capacitor } from "@capacitor/core";
/** Existing production host; native local documents cannot supply an HTTP Referer. */
export const DEFAULT_YOUTUBE_HOST_ORIGIN = "https://yourbible-lodge.vercel.app";
export const YOUTUBE_PLAYER_BRIDGE_PATH = "/youtube-player.html";

export function httpOrigin(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}

export function youtubeHostOrigin(origin?: string): string {
  const configured = httpOrigin(import.meta.env.VITE_YOUTUBE_HOST_ORIGIN);
  const candidate = origin ?? (typeof window !== "undefined" ? window.location.origin : undefined);
  const localNative = Capacitor.isNativePlatform() && /^(?:https?:\/\/)?localhost(?::\d+)?$/.test(candidate ?? "");
  return (localNative ? null : httpOrigin(candidate))
    ?? (configured?.startsWith("https://") ? configured : DEFAULT_YOUTUBE_HOST_ORIGIN);
}

export function youtubeNeedsHostedPlayer(origin?: string): boolean {
  const current = origin ?? (typeof window !== "undefined" ? window.location.origin : undefined);
  // SSR defaults to a normal direct embed; local/file/Capacitor documents use HTTPS.
  return Capacitor.isNativePlatform() || (current !== undefined && !httpOrigin(current));
}

export function safeWidgetReferrer(value: string | undefined, fallback: string): string {
  try {
    const url = new URL(value ?? fallback);
    if (!httpOrigin(url.href)) return fallback;
    url.search = ""; url.hash = "";
    return url.href;
  } catch { return fallback; }
}
