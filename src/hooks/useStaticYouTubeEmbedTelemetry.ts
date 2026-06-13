import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "@/hooks/use-toast";
import { embedNeedsResumeSeek } from "@/lib/framework/playbackSeconds";
import {
  isIosYouTubeBackgroundAudioActive,
  startIosYouTubeBackgroundAudio,
  stopIosYouTubeBackgroundAudio,
} from "@/lib/youtube/iosBackgroundAudio";
import { isIphoneWebKit } from "@/lib/youtube/platform";
import {
  canSendEmbedAutoResume,
  EMBED_PLAYER_POINTER_INTENT_MS,
  shouldAutoResumeAfterEmbedPause,
  shouldUseEmbedAutoResumeKeepalive,
} from "@/lib/youtube/embedAutoResume";
import { youtubeDocumentPipActiveRef } from "@/lib/youtube/documentPictureInPicture";
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
  YT_EMBED_STATE,
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
  /** Pause on app background and resume on return (iOS PWA / mobile Safari). */
  syncBackgroundPlayback?: boolean;
  getSavedPlaybackSeconds?: () => number;
  onPersistPlaybackSeconds?: (seconds: number) => void;
  /** iPhone: continue audio via direct stream when iframe cannot background. */
  iosAudioHandoff?: {
    videoId: string | null;
    title?: string | null;
  };
}) {
  const {
    videoSlotRef,
    enabled,
    initialSeconds = 0,
    syncBackgroundPlayback = false,
    getSavedPlaybackSeconds,
    onPersistPlaybackSeconds,
    iosAudioHandoff,
  } = options;
  const currentTimeRef = useRef(Math.max(0, initialSeconds));
  const lastTelemetryAtRef = useRef(0);
  const isPlayingRef = useRef(false);
  /** User (or app resume logic) wants playback — survives YouTube-initiated PAUSE events. */
  const intendedPlayingRef = useRef(false);
  const resumeOnVisibleRef = useRef(false);
  const resumeAfterPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppPauseAtRef = useRef(0);
  const autoResumeCountRef = useRef(0);
  const autoResumeWindowStartRef = useRef(0);
  const lastAutoResumeAtRef = useRef(0);
  const recentPlayerPointerRef = useRef(false);
  const pointerIntentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getSavedPlaybackSecondsRef = useRef(getSavedPlaybackSeconds);
  const onPersistPlaybackSecondsRef = useRef(onPersistPlaybackSeconds);
  getSavedPlaybackSecondsRef.current = getSavedPlaybackSeconds;
  onPersistPlaybackSecondsRef.current = onPersistPlaybackSeconds;
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

  const runCommand = useCallback(
    (func: YouTubeEmbedCommand, args: number[] = []) => {
      const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      postYouTubeEmbedCommand(iframe, func, args);
    },
    [videoSlotRef],
  );

  const clearResumeAfterPauseTimer = useCallback(() => {
    if (resumeAfterPauseTimerRef.current != null) {
      window.clearTimeout(resumeAfterPauseTimerRef.current);
      resumeAfterPauseTimerRef.current = null;
    }
  }, []);

  const sendResumePlayCommand = useCallback(() => {
    if (!canSendEmbedAutoResume(lastAutoResumeAtRef.current)) return;
    const now = Date.now();
    if (now - autoResumeWindowStartRef.current > 60_000) {
      autoResumeWindowStartRef.current = now;
      autoResumeCountRef.current = 0;
    }
    if (autoResumeCountRef.current >= 3) {
      intendedPlayingRef.current = false;
      return;
    }
    autoResumeCountRef.current += 1;
    lastAutoResumeAtRef.current = now;
    runCommand("playVideo");
  }, [runCommand]);

  /** YouTube embeds often pause on PiP reposition, scroll, or buffer stalls — resume if user did not pause. */
  const scheduleResumeIfIntended = useCallback(() => {
    if (
      !shouldAutoResumeAfterEmbedPause({
        intendedPlaying: intendedPlayingRef.current,
        msSinceAppPause: Date.now() - lastAppPauseAtRef.current,
        recentPlayerPointer: recentPlayerPointerRef.current,
        documentHidden: document.hidden,
      })
    ) {
      if (recentPlayerPointerRef.current) intendedPlayingRef.current = false;
      clearResumeAfterPauseTimer();
      return;
    }
    clearResumeAfterPauseTimer();
    resumeAfterPauseTimerRef.current = window.setTimeout(() => {
      resumeAfterPauseTimerRef.current = null;
      if (!intendedPlayingRef.current || document.hidden || isPlayingRef.current) return;
      sendResumePlayCommand();
    }, 450);
  }, [clearResumeAfterPauseTimer, sendResumePlayCommand]);

  const markRecentPlayerPointer = useCallback(() => {
    recentPlayerPointerRef.current = true;
    if (pointerIntentTimerRef.current != null) {
      window.clearTimeout(pointerIntentTimerRef.current);
    }
    pointerIntentTimerRef.current = window.setTimeout(() => {
      recentPlayerPointerRef.current = false;
      pointerIntentTimerRef.current = null;
    }, EMBED_PLAYER_POINTER_INTENT_MS);
  }, []);

  const playVideo = useCallback(() => {
    intendedPlayingRef.current = true;
    isPlayingRef.current = true;
    setIsPlaying(true);
    runCommand("playVideo");
  }, [runCommand]);

  const pauseVideo = useCallback(
    (opts?: { clearIntent?: boolean }) => {
      lastAppPauseAtRef.current = Date.now();
      if (opts?.clearIntent !== false) intendedPlayingRef.current = false;
      clearResumeAfterPauseTimer();
      isPlayingRef.current = false;
      setIsPlaying(false);
      runCommand("pauseVideo");
    },
    [clearResumeAfterPauseTimer, runCommand],
  );

  const togglePlayback = useCallback(() => {
    if (isPlayingRef.current) pauseVideo();
    else playVideo();
  }, [pauseVideo, playVideo]);

  const muteVideo = useCallback(() => {
    runCommand("mute");
  }, [runCommand]);

  const unMuteVideo = useCallback(() => {
    runCommand("unMute");
  }, [runCommand]);

  const seekTo = useCallback(
    (seconds: number, allowSeekAhead = true) => {
      const s = Math.max(0, seconds);
      currentTimeRef.current = s;
      lastTelemetryAtRef.current = Date.now();
      runCommand("seekTo", [Math.round(s), allowSeekAhead ? 1 : 0]);
    },
    [runCommand],
  );

  /** Muted play then pause so the embed shows a live frame (not the big play overlay). */
  const primeToPausedFrame = useCallback(
    (seconds: number) => {
      const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      if (!iframe?.contentWindow) return;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener("message", onMessage);
        if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
        pauseVideo();
        unMuteVideo();
      };

      const onMessage = (event: MessageEvent) => {
        if (!isYouTubeEmbedMessageOrigin(event.origin)) return;
        if (event.source !== iframe.contentWindow) return;
        const msg = parseYouTubeEmbedMessage(event.data);
        if (!msg?.event) return;
        if (msg.event === "onStateChange" && typeof msg.info === "number") {
          if (msg.info === YT_EMBED_STATE.PLAYING) finish();
          return;
        }
        if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
          const state = msg.info.playerState;
          if (typeof state === "number" && embedStateIsPlaying(state)) finish();
        }
      };

      window.addEventListener("message", onMessage);
      const fallbackTimer = window.setTimeout(finish, 1500);

      muteVideo();
      seekTo(seconds, true);
      playVideo();
    },
    [muteVideo, pauseVideo, playVideo, seekTo, unMuteVideo, videoSlotRef],
  );

  useEffect(() => {
    if (!enabled) return;

    const onMessage = (event: MessageEvent) => {
      if (!isYouTubeEmbedMessageOrigin(event.origin)) return;
      const iframe = getStaticYouTubeEmbedIframe(videoSlotRef.current);
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return;

      const msg = parseYouTubeEmbedMessage(event.data);
      if (!msg?.event) return;

      if (msg.event === "onStateChange" && typeof msg.info === "number") {
        const state = msg.info;
        if (state === YT_EMBED_STATE.ENDED) intendedPlayingRef.current = false;
        if (state === YT_EMBED_STATE.PLAYING) intendedPlayingRef.current = true;
        const playing = embedStateIsPlaying(state);
        if (playing !== isPlayingRef.current) {
          isPlayingRef.current = playing;
          setIsPlaying(playing);
        }
        if (state === YT_EMBED_STATE.PAUSED) scheduleResumeIfIntended();
        return;
      }

      if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
        applyEmbedCurrentTime(currentTimeRef, lastTelemetryAtRef, currentTimeFromEmbedInfo(msg.info));
        const state = msg.info.playerState;
        if (typeof state === "number") {
          if (state === YT_EMBED_STATE.ENDED) intendedPlayingRef.current = false;
          if (state === YT_EMBED_STATE.PLAYING) intendedPlayingRef.current = true;
          const playing = embedStateIsPlaying(state);
          if (playing !== isPlayingRef.current) {
            isPlayingRef.current = playing;
            setIsPlaying(playing);
          }
          if (state === YT_EMBED_STATE.PAUSED) scheduleResumeIfIntended();
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
  }, [enabled, requestCurrentTime, scheduleResumeIfIntended, videoSlotRef]);

  useEffect(() => {
    if (!enabled) return;
    const host = videoSlotRef.current;
    if (!host) return;
    host.addEventListener("pointerdown", markRecentPlayerPointer, { capture: true });
    return () => host.removeEventListener("pointerdown", markRecentPlayerPointer, { capture: true });
  }, [enabled, markRecentPlayerPointer, videoSlotRef]);

  /** Catch embed pauses that never emit onStateChange (jsapi channel hiccups). Skip on iOS — flaky playerState. */
  useEffect(() => {
    if (!enabled || !shouldUseEmbedAutoResumeKeepalive()) return;
    const keepalive = window.setInterval(() => {
      if (!intendedPlayingRef.current || document.hidden || isPlayingRef.current) return;
      if (recentPlayerPointerRef.current) return;
      if (Date.now() - lastAppPauseAtRef.current < 500) return;
      sendResumePlayCommand();
    }, 2500);
    return () => window.clearInterval(keepalive);
  }, [enabled, sendResumePlayCommand]);

  /** iOS suspends YouTube iframes without a PAUSED event — sync state and resume cleanly. */
  useEffect(() => {
    if (!enabled || !syncBackgroundPlayback) return;

    const resumeAfterVisible = (shouldResume: boolean, overrideSeconds?: number) => {
      if (youtubeDocumentPipActiveRef.current) return;

      const runResume = (attempt = 0) => {
        requestCurrentTime();
        const live = currentTimeRef.current;
        const savedFromParent = getSavedPlaybackSecondsRef.current?.() ?? 0;
        const resolved = Math.max(
          overrideSeconds ?? savedFromParent,
          Number.isFinite(live) ? live : 0,
        );
        currentTimeRef.current = resolved;
        onPersistPlaybackSecondsRef.current?.(resolved);

        const fresh = isTelemetryFresh(800);
        const iframeReset =
          typeof document !== "undefined" &&
          "wasDiscarded" in document &&
          (document as Document & { wasDiscarded?: boolean }).wasDiscarded;

        if (
          embedNeedsResumeSeek(live, resolved, fresh, shouldResume || iframeReset) &&
          resolved > 0
        ) {
          seekTo(resolved, true);
        }
        if (shouldResume && !isPlayingRef.current) {
          playVideo();
        } else if (attempt < 2 && shouldResume && !fresh) {
          window.setTimeout(() => runResume(attempt + 1), 200);
        }
      };

      window.setTimeout(() => runResume(0), 250);
    };

    const onVisibility = () => {
      if (document.hidden) {
        resumeOnVisibleRef.current = isPlayingRef.current;
        requestCurrentTime();
        const seconds = currentTimeRef.current;
        onPersistPlaybackSecondsRef.current?.(seconds);

        if (youtubeDocumentPipActiveRef.current) return;

        const videoId = iosAudioHandoff?.videoId;
        if (
          isIphoneWebKit() &&
          videoId &&
          isPlayingRef.current
        ) {
          pauseVideo({ clearIntent: false });
          void startIosYouTubeBackgroundAudio({
            videoId,
            title: iosAudioHandoff?.title,
            startSeconds: seconds,
          }).then((ok) => {
            if (ok) {
              isPlayingRef.current = true;
              setIsPlaying(true);
            } else {
              toast({
                title: "Background audio unavailable",
                description: "This video paused when you left the app. Tap play to continue.",
              });
            }
          });
        }
        return;
      }

      if (isIosYouTubeBackgroundAudioActive()) {
        const { seconds, wasPlaying } = stopIosYouTubeBackgroundAudio();
        resumeAfterVisible(wasPlaying, seconds);
        return;
      }

      if (youtubeDocumentPipActiveRef.current) return;

      const shouldResume = resumeOnVisibleRef.current;
      resumeOnVisibleRef.current = false;
      resumeAfterVisible(shouldResume);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (youtubeDocumentPipActiveRef.current) return;
      if (!event.persisted && !("wasDiscarded" in document && (document as Document & { wasDiscarded?: boolean }).wasDiscarded)) {
        return;
      }
      const shouldResume = resumeOnVisibleRef.current;
      resumeOnVisibleRef.current = false;
      resumeAfterVisible(shouldResume);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearResumeAfterPauseTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [
    clearResumeAfterPauseTimer,
    enabled,
    syncBackgroundPlayback,
    isTelemetryFresh,
    pauseVideo,
    playVideo,
    requestCurrentTime,
    seekTo,
  ]);

  return {
    getCurrentTime: () => currentTimeRef.current,
    getIsPlaying: () => isPlayingRef.current,
    isPlaying,
    playVideo,
    pauseVideo,
    togglePlayback,
    muteVideo,
    unMuteVideo,
    seekTo,
    primeToPausedFrame,
    requestCurrentTime,
    isTelemetryFresh,
    currentTimeRef,
    isPlayingRef,
    intendedPlayingRef,
  };
}
