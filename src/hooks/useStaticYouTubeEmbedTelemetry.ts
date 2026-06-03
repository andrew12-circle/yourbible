import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  getStaticYouTubeEmbedIframe,
  postYouTubeEmbedCommand,
  type YouTubeEmbedCommand,
} from "@/lib/youtube/embed";
import {
  currentTimeFromEmbedInfo,
  embedStateIsPlaying,
  isYouTubeEmbedMessageOrigin,
  parseYouTubeEmbedMessage,
} from "@/lib/youtube/embedTelemetry";

function applyEmbedCurrentTime(
  currentTimeRef: { current: number },
  lastTelemetryAtRef: { current: number },
  t: unknown,
) {
  if (typeof t !== "number" || !Number.isFinite(t)) return;
  currentTimeRef.current = Math.max(0, t);
  lastTelemetryAtRef.current = Date.now();
}

/** Track playhead + playing state from the in-slot YouTube embed (enablejsapi=1). */
export function useStaticYouTubeEmbedTelemetry(options: {
  videoSlotRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  initialSeconds?: number;
}) {
  const { videoSlotRef, enabled, initialSeconds = 0 } = options;
  const currentTimeRef = useRef(Math.max(0, initialSeconds));
  const lastTelemetryAtRef = useRef(0);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const s = Math.max(0, initialSeconds);
    currentTimeRef.current = s;
  }, [initialSeconds]);

  const requestCurrentTime = useCallback(() => {
    const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "getCurrentTime", args: [] }),
        "https://www.youtube.com",
      );
    } catch {
      /* ignore */
    }
  }, [videoSlotRef]);

  const isTelemetryFresh = useCallback((maxAgeMs = 2500) => {
    if (lastTelemetryAtRef.current <= 0) return false;
    return Date.now() - lastTelemetryAtRef.current <= maxAgeMs;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMessage = (event: MessageEvent) => {
      if (!isYouTubeEmbedMessageOrigin(event.origin)) return;
      const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return;

      const msg = parseYouTubeEmbedMessage(event.data);
      if (!msg?.event) return;

      if (msg.event === "onStateChange" && typeof msg.info === "number") {
        const playing = embedStateIsPlaying(msg.info);
        isPlayingRef.current = playing;
        setIsPlaying(playing);
        return;
      }

      if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
        applyEmbedCurrentTime(currentTimeRef, lastTelemetryAtRef, currentTimeFromEmbedInfo(msg.info));
        const state = msg.info.playerState;
        if (typeof state === "number") {
          const playing = embedStateIsPlaying(state);
          if (playing !== isPlayingRef.current) {
            isPlayingRef.current = playing;
            setIsPlaying(playing);
          }
        }
      }
    };

    window.addEventListener("message", onMessage);

    const startListening = () => {
      const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      if (!iframe?.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
          "https://www.youtube.com",
        );
      } catch {
        /* ignore */
      }
    };

    startListening();
    requestCurrentTime();
    const listenInterval = window.setInterval(startListening, 2000);
    const pollInterval = window.setInterval(requestCurrentTime, 250);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(listenInterval);
      window.clearInterval(pollInterval);
    };
  }, [enabled, requestCurrentTime, videoSlotRef]);

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
      const s = Math.max(0, seconds);
      currentTimeRef.current = s;
      lastTelemetryAtRef.current = Date.now();
      runCommand("seekTo", [Math.round(s), allowSeekAhead ? 1 : 0]);
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
    requestCurrentTime,
    isTelemetryFresh,
    currentTimeRef,
    isPlayingRef,
  };
}
