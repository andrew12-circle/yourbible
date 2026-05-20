import { useCallback, useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!enabled || !videoId) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    void loadYouTubeIframeApi().then(() => {
      if (cancelled || !mountRef.current || !videoId) return;

      playerRef.current?.destroy();
      playerRef.current = null;

      const start = Math.max(0, Math.floor(startRef.current));
      playerRef.current = new window.YT!.Player(mountRef.current, {
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
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setReady(false);
    };
  }, [enabled, videoId]);

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

  return {
    mountRef,
    playerReady: ready,
    reparentTo,
    getCurrentTime,
    seekTo,
  };
}
