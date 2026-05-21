import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  getStaticYouTubeEmbedIframe,
  postYouTubeEmbedCommand,
  type YouTubeEmbedCommand,
} from "@/lib/youtube/embed";
import {
  embedStateIsPlaying,
  isYouTubeEmbedMessageOrigin,
  parseYouTubeEmbedMessage,
} from "@/lib/youtube/embedTelemetry";

/** Track playhead + playing state from the in-slot YouTube embed (enablejsapi=1). */
export function useStaticYouTubeEmbedTelemetry(options: {
  videoSlotRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  initialSeconds?: number;
}) {
  const { videoSlotRef, enabled, initialSeconds = 0 } = options;
  const currentTimeRef = useRef(Math.max(0, Math.floor(initialSeconds)));
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const onMessage = (event: MessageEvent) => {
      if (!isYouTubeEmbedMessageOrigin(event.origin)) return;
      const msg = parseYouTubeEmbedMessage(event.data);
      if (!msg?.event) return;

      if (msg.event === "onStateChange" && typeof msg.info === "number") {
        const playing = embedStateIsPlaying(msg.info);
        isPlayingRef.current = playing;
        setIsPlaying(playing);
        return;
      }

      if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
        const t = msg.info.currentTime;
        if (typeof t === "number" && Number.isFinite(t)) {
          currentTimeRef.current = Math.max(0, Math.floor(t));
        }
      }
    };

    window.addEventListener("message", onMessage);

    const requestInfo = () => {
      const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      if (!iframe?.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: 1 }),
          "https://www.youtube.com",
        );
      } catch {
        /* ignore */
      }
    };

    requestInfo();
    const interval = window.setInterval(requestInfo, 500);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(interval);
    };
  }, [enabled, videoSlotRef]);

  const runCommand = useCallback(
    (func: YouTubeEmbedCommand, args: number[] = []) => {
      const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      postYouTubeEmbedCommand(iframe, func, args);
    },
    [videoSlotRef],
  );

  const playVideo = useCallback(() => {
    isPlayingRef.current = true;
    setIsPlaying(true);
    runCommand("playVideo");
  }, [runCommand]);

  const pauseVideo = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    runCommand("pauseVideo");
  }, [runCommand]);

  const togglePlayback = useCallback(() => {
    if (isPlayingRef.current) pauseVideo();
    else playVideo();
  }, [pauseVideo, playVideo]);

  const seekTo = useCallback(
    (seconds: number, allowSeekAhead = true) => {
      const s = Math.max(0, Math.floor(seconds));
      currentTimeRef.current = s;
      runCommand("seekTo", [s, allowSeekAhead ? 1 : 0]);
    },
    [runCommand],
  );

  return {
    getCurrentTime: () => currentTimeRef.current,
    getIsPlaying: () => isPlayingRef.current,
    isPlaying,
    playVideo,
    pauseVideo,
    togglePlayback,
    seekTo,
    currentTimeRef,
    isPlayingRef,
  };
}
