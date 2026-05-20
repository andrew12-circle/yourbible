import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  readPlaybackSecondsFromSession,
  writePlaybackSecondsToSession,
} from "@/lib/framework/artifactYoutubePip";

type YTPlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setSize: (width: number, height: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
};

type YTNamespace = {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState?: { PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
  });

  return apiLoadPromise;
}

export function useYouTubeEmbedPlayer(options: {
  videoId: string | null;
  enabled: boolean;
  startSeconds?: number;
  /** Persist / restore playback position per artifact. */
  artifactId?: string | null;
  /** Changes when the player shell moves (inline vs PiP) so iframe size re-syncs. */
  layoutKey?: string;
}) {
  const { videoId, enabled, startSeconds = 0, artifactId = null, layoutKey = "inline" } = options;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const mountedVideoIdRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const resumeOnVisibleRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const startRef = useRef(startSeconds);
  startRef.current = startSeconds;

  const syncPlayerSize = useCallback((host: HTMLElement) => {
    if (!playerRef.current) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w > 0 && h > 0) playerRef.current.setSize(w, h);
  }, []);

  const resumeIfWasPlaying = useCallback((wasPlaying: boolean) => {
    if (!wasPlaying) return;
    requestAnimationFrame(() => {
      try {
        playerRef.current?.playVideo();
      } catch {
        /* player not ready */
      }
    });
  }, []);

  const persistPlayback = useCallback(() => {
    if (!artifactId || !playerRef.current) return;
    try {
      const t = playerRef.current.getCurrentTime();
      if (typeof t === "number" && Number.isFinite(t)) {
        writePlaybackSecondsToSession(artifactId, t);
        startRef.current = Math.max(0, Math.floor(t));
      }
    } catch {
      /* ignore */
    }
  }, [artifactId]);

  const destroyPlayer = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch {
      /* player already torn down */
    }
    playerRef.current = null;
    mountedVideoIdRef.current = null;
    playingRef.current = false;
    setPlaying(false);
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !videoId) {
      setReady(false);
      return;
    }

    let cancelled = false;
    let raf = 0;

    const saved =
      artifactId != null ? readPlaybackSecondsFromSession(artifactId) : null;
    const initialStart = Math.max(
      0,
      Math.floor(saved ?? startRef.current ?? startSeconds),
    );
    startRef.current = initialStart;

    const initPlayer = () => {
      if (cancelled || !mountRef.current || !videoId || !window.YT?.Player) return false;

      const host = mountRef.current.parentElement;
      if (!host || host.clientWidth < 8 || host.clientHeight < 8) return false;

      if (playerRef.current && mountedVideoIdRef.current === videoId) {
        syncPlayerSize(host);
        setReady(true);
        return true;
      }

      destroyPlayer();

      try {
        playerRef.current = new window.YT.Player(mountRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start: initialStart,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (!cancelled) {
                setReady(true);
                syncPlayerSize(host);
                if (resumeOnVisibleRef.current) {
                  resumeOnVisibleRef.current = false;
                  resumeIfWasPlaying(true);
                }
              }
            },
            onStateChange: (e) => {
              const playingState = window.YT?.PlayerState?.PLAYING;
              if (playingState != null) {
                const isPlaying = e.data === playingState;
                playingRef.current = isPlaying;
                setPlaying(isPlaying);
              }
            },
          },
        });
        mountedVideoIdRef.current = videoId;
      } catch (err) {
        console.error("[useYouTubeEmbedPlayer] failed to create player", err);
        destroyPlayer();
        setReady(false);
        return false;
      }
      return true;
    };

    setReady(false);
    let initAttempts = 0;
    const scheduleInit = () => {
      if (cancelled) return;
      if (initPlayer()) return;
      initAttempts += 1;
      if (initAttempts > 120) return;
      raf = window.requestAnimationFrame(scheduleInit);
    };

    void loadYouTubeIframeApi().then(() => {
      if (!cancelled) scheduleInit();
    });

    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
      persistPlayback();
      destroyPlayer();
      setReady(false);
    };
  }, [
    artifactId,
    destroyPlayer,
    enabled,
    persistPlayback,
    resumeIfWasPlaying,
    startSeconds,
    syncPlayerSize,
    videoId,
  ]);

  useLayoutEffect(() => {
    const host = mountRef.current?.parentElement;
    if (!host || !playerRef.current) return;
    syncPlayerSize(host);
    const ro = new ResizeObserver(() => syncPlayerSize(host));
    ro.observe(host);
    return () => ro.disconnect();
  }, [layoutKey, ready, syncPlayerSize]);

  useEffect(() => {
    if (!ready || !artifactId) return;
    const tick = window.setInterval(persistPlayback, 2000);
    return () => window.clearInterval(tick);
  }, [artifactId, persistPlayback, ready]);

  useEffect(() => {
    const onVisibility = () => {
      if (!playerRef.current) return;
      if (document.hidden) {
        resumeOnVisibleRef.current = playingRef.current;
        persistPlayback();
        try {
          playerRef.current.pauseVideo();
        } catch {
          /* ignore */
        }
      } else {
        persistPlayback();
        const shouldResume = resumeOnVisibleRef.current;
        resumeOnVisibleRef.current = false;
        resumeIfWasPlaying(shouldResume);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [persistPlayback, resumeIfWasPlaying]);

  const getCurrentTime = useCallback(() => {
    try {
      const t = playerRef.current?.getCurrentTime();
      if (typeof t === "number" && Number.isFinite(t)) return Math.max(0, Math.floor(t));
    } catch {
      /* player not ready */
    }
    return Math.max(0, Math.floor(startRef.current));
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      startRef.current = s;
      if (artifactId) writePlaybackSecondsToSession(artifactId, s);
      try {
        playerRef.current?.seekTo(s, true);
      } catch {
        /* ignore */
      }
    },
    [artifactId],
  );

  const getIsPlaying = useCallback(() => playingRef.current, []);

  return useMemo(
    () => ({
      mountRef,
      playerReady: ready,
      isPlaying: playing,
      getIsPlaying,
      getCurrentTime,
      seekTo,
    }),
    [getCurrentTime, getIsPlaying, playing, ready, seekTo],
  );
}
