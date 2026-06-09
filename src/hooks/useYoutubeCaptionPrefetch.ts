import { useEffect, useRef, useState } from "react";
import { fetchYoutubeCaptionsViaInvidious } from "@/lib/framework/youtubeInvidiousCaptions";
import { fetchYoutubeCaptionsInBrowser } from "@/lib/framework/youtubeTranscriptPlusClient";
import { getYouTubeVideoId } from "@/lib/youtube";

export type YoutubeCaptionPrefetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; rawText: string; source: "browser" | "invidious" }
  | { status: "unavailable"; detail?: string };

export function useYoutubeCaptionPrefetch(url: string): YoutubeCaptionPrefetchState {
  const [state, setState] = useState<YoutubeCaptionPrefetchState>({ status: "idle" });
  const lastVideoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) {
      setState({ status: "idle" });
      lastVideoIdRef.current = null;
      return;
    }
    if (videoId === lastVideoIdRef.current) return;
    lastVideoIdRef.current = videoId;

    let cancelled = false;
    setState({ status: "loading" });

    const timer = window.setTimeout(() => {
      void (async () => {
        const browser = await fetchYoutubeCaptionsInBrowser(videoId);
        if (cancelled) return;
        if (browser.text?.trim()) {
          setState({ status: "ready", rawText: browser.text, source: "browser" });
          return;
        }

        const invidious = await fetchYoutubeCaptionsViaInvidious(videoId);
        if (cancelled) return;
        if (invidious?.trim()) {
          setState({ status: "ready", rawText: invidious, source: "invidious" });
          return;
        }

        const detail = browser.error ?? "No captions returned from browser or Invidious.";
        setState({ status: "unavailable", detail });
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url]);

  return state;
}
