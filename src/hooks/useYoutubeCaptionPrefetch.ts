import { useEffect, useRef, useState } from "react";
import { fetchYoutubeCaptionsViaLocalDevApi } from "@/lib/framework/youtubeLocalCaptions";
import { resolveYoutubeCaptionsViaEdge } from "@/lib/framework/youtubeEdgeCaptions";
import { fetchYoutubeCaptionsViaInvidious } from "@/lib/framework/youtubeInvidiousCaptions";
import { fetchYoutubeCaptionsInBrowser } from "@/lib/framework/youtubeTranscriptPlusClient";
import { getYouTubeVideoId } from "@/lib/youtube";

export type YoutubeCaptionPrefetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; rawText: string; source: "local-dev" | "edge" | "browser" | "invidious" }
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
        const local = await fetchYoutubeCaptionsViaLocalDevApi(videoId);
        if (cancelled) return;
        if (local.text?.trim()) {
          setState({ status: "ready", rawText: local.text, source: "local-dev" });
          return;
        }

        const edge = await resolveYoutubeCaptionsViaEdge(videoId);
        if (cancelled) return;
        if (edge.text?.trim()) {
          setState({ status: "ready", rawText: edge.text, source: "edge" });
          return;
        }

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

        const detail =
          [local.error ? `local: ${local.error}` : null, ...edge.attempts, browser.error]
            .filter(Boolean)
            .join("; ") || "No captions returned.";
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
