import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

type YTPlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setSize: (width: number, height: number) => void;
  playVideo: () => void;
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
  PlayerState?: { PLAYING: number };
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
}) {
  const { videoId, enabled, startSeconds = 0 } = options;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playingRef = useRef(false);
  const [ready, setReady] = useState(false);
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

  const destroyPlayer = useCallback(() => {
    try {
      playerRef.current?.destroy();
    } catch {
      /* player already torn down */
    }
    playerRef.current = null;
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !videoId) {
      setReady(false);
      return;
    }

    let cancelled = false;
    let raf = 0;
    setReady(false);

    const initPlayer = () => {
      if (cancelled || !mountRef.current || !videoId || !window.YT?.Player) return false;

      const host = mountRef.current.parentElement;
      if (!host || host.clientWidth < 8 || host.clientHeight < 8) return false;

      destroyPlayer();

      const start = Math.max(0, Math.floor(startRef.current));
      try {
        playerRef.current = new window.YT.Player(mountRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            start,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onStateChange: (e) => {
              const playing = window.YT?.PlayerState?.PLAYING;
              if (playing != null) playingRef.current = e.data === playing;
            },
          },
        });
      } catch (err) {
        console.error("[useYouTubeEmbedPlayer] failed to create player", err);
        destroyPlayer();
        setReady(false);
        return false;
      }
      return true;
    };

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
      destroyPlayer();
      setReady(false);
    };
  }, [destroyPlayer, enabled, videoId]);

  useLayoutEffect(() => {
    const host = mountRef.current?.parentElement;
    if (!host || !playerRef.current) return;
    syncPlayerSize(host);
    const ro = new ResizeObserver(() => syncPlayerSize(host));
    ro.observe(host);
    return () => ro.disconnect();
  }, [ready, syncPlayerSize]);

  const reparentTo = useCallback(
    (host: HTMLElement | null) => {
      const el = mountRef.current;
      if (!el || !host || el.parentElement === host) return;
      const wasPlaying = playingRef.current;
      host.appendChild(el);
      syncPlayerSize(host);
      resumeIfWasPlaying(wasPlaying);
    },
    [resumeIfWasPlaying, syncPlayerSize],
  );

  const getCurrentTime = useCallback(() => {
    try {
      const t = playerRef.current?.getCurrentTime();
      if (typeof t === "number" && Number.isFinite(t)) return Math.max(0, Math.floor(t));
    } catch {
      /* player not ready */
    }
    return Math.max(0, Math.floor(startRef.current));
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    startRef.current = s;
    try {
      playerRef.current?.seekTo(s, true);
    } catch {
      /* ignore */
    }
  }, []);

  return useMemo(
    () => ({
      mountRef,
      playerReady: ready,
      reparentTo,
      getCurrentTime,
      seekTo,
    }),
    [getCurrentTime, ready, reparentTo, seekTo],
  );
}
