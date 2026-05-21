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
    const finish = () => {
      if (window.YT?.Player) resolve();
    };

    if (window.YT?.Player) {
      resolve();
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    } else {
      // Script may already be on the page while the ready callback already ran (SPA navigation).
      let attempts = 0;
      const poll = () => {
        if (window.YT?.Player) {
          finish();
          return;
        }
        attempts += 1;
        if (attempts > 600) {
          resolve();
          return;
        }
        window.requestAnimationFrame(poll);
      };
      poll();
    }
  });

  return apiLoadPromise;
}

const MIN_HOST_PX = 8;
const MAX_INIT_ATTEMPTS = 240;

// #region agent log
const dbgYt = (
  hypothesisId: string,
  message: string,
  data: Record<string, unknown>,
  location = "useYouTubeEmbedPlayer.ts",
) => {
  const payload = {
    sessionId: "c783b2",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    const key = "debug:c783b2";
    const prev = sessionStorage.getItem(key);
    const arr = prev ? (JSON.parse(prev) as unknown[]) : [];
    arr.push(payload);
    sessionStorage.setItem(key, JSON.stringify(arr.slice(-80)));
  } catch {
    /* ignore */
  }
  fetch("http://127.0.0.1:7557/ingest/d8ad423f-f74d-4738-aea6-21deae4ae80c", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c783b2" },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

function iframeAttachedToMount(mount: HTMLDivElement | null): boolean {
  const iframe = mount?.querySelector("iframe");
  return iframe instanceof HTMLIFrameElement && mount.contains(iframe);
}

function playerHostElement(mount: HTMLDivElement | null): HTMLElement | null {
  if (!mount) return null;
  const shell = mount.closest("[data-youtube-player-shell]");
  if (shell instanceof HTMLElement) return shell;
  return mount.parentElement;
}

function hostLayoutPx(host: HTMLElement | null): { w: number; h: number } {
  if (!host) return { w: 0, h: 0 };
  let w = host.clientWidth;
  let h = host.clientHeight;
  if (w < MIN_HOST_PX || h < MIN_HOST_PX) {
    const rect = host.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
  }
  return { w, h };
}

function hostHasLayout(host: HTMLElement | null): boolean {
  const { w, h } = hostLayoutPx(host);
  return w >= MIN_HOST_PX && h >= MIN_HOST_PX;
}
// #endregion
/** Clear loading overlay if YT onReady is slow but the iframe has loaded. */
const IFRAME_READY_FALLBACK_MS = 6000;

/**
 * Player lifecycle contract:
 * - Create / destroy: only when `videoId` or `enabled` changes, or on page unmount.
 * - `layoutKey`: triggers ResizeObserver + setSize only — never destroys the iframe.
 * - `seekTo`: updates position and optional play — never destroys the iframe.
 */
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
  const pendingSeekRef = useRef<number | null>(null);
  const startRef = useRef(startSeconds);
  startRef.current = startSeconds;
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reinitNonce, setReinitNonce] = useState(0);
  const hookMountedRef = useRef(false);

  const syncPlayerSize = useCallback((host: HTMLElement) => {
    if (!playerRef.current) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w >= MIN_HOST_PX && h >= MIN_HOST_PX) playerRef.current.setSize(w, h);
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

  const applyPendingSeek = useCallback(() => {
    const pending = pendingSeekRef.current;
    if (pending == null || !playerRef.current) return;
    pendingSeekRef.current = null;
    try {
      playerRef.current.seekTo(pending, true);
      startRef.current = pending;
    } catch {
      /* player not ready */
    }
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
    // #region agent log
    dbgYt("H5", "destroyPlayer", { hadPlayer: Boolean(playerRef.current) });
    // #endregion
    try {
      playerRef.current?.destroy();
    } catch {
      /* player already torn down */
    }
    playerRef.current = null;
    pendingSeekRef.current = null;
    mountedVideoIdRef.current = null;
    playingRef.current = false;
    setPlaying(false);
    setReady(false);
  }, []);

  useLayoutEffect(() => {
    // #region agent log
    dbgYt("H1", "embed effect run", { enabled, videoId, layoutKey });
    // #endregion
    if (!enabled || !videoId) {
      setLoading(false);
      setInitTimedOut(false);
      destroyPlayer();
      return;
    }

    let cancelled = false;
    let raf = 0;
    let iframeFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let iframeObserver: MutationObserver | null = null;

    const clearIframeFallback = () => {
      if (iframeFallbackTimer != null) {
        window.clearTimeout(iframeFallbackTimer);
        iframeFallbackTimer = null;
      }
      iframeObserver?.disconnect();
      iframeObserver = null;
    };

    const markReadyFromIframe = (host: HTMLElement) => {
      if (cancelled || !playerRef.current) return;
      const mount = mountRef.current;
      const attached = iframeAttachedToMount(mount);
      const layoutHost = playerHostElement(mount) ?? host;
      const { w: hostW, h: hostH } = hostLayoutPx(layoutHost);
      // #region agent log
      dbgYt("H4", "markReadyFromIframe", {
        hostW,
        hostH,
        hasIframe: attached,
        accepted: attached,
      });
      // #endregion
      if (!attached) return;
      setReady(true);
      setLoading(false);
      setInitTimedOut(false);
      requestAnimationFrame(() => {
        if (layoutHost && hostHasLayout(layoutHost)) syncPlayerSize(layoutHost);
      });
      applyPendingSeek();
    };

    const armIframeLoadFallback = (host: HTMLElement) => {
      clearIframeFallback();
      const bindIframe = (iframe: HTMLIFrameElement) => {
        iframe.addEventListener(
          "load",
          () => {
            if (!cancelled && playerRef.current) markReadyFromIframe(host);
          },
          { once: true },
        );
      };
      const existing = mountRef.current?.querySelector("iframe");
      if (existing instanceof HTMLIFrameElement) {
        bindIframe(existing);
      } else if (mountRef.current) {
        iframeObserver = new MutationObserver(() => {
          const iframe = mountRef.current?.querySelector("iframe");
          if (iframe instanceof HTMLIFrameElement) {
            bindIframe(iframe);
            iframeObserver?.disconnect();
            iframeObserver = null;
          }
        });
        iframeObserver.observe(mountRef.current, { childList: true, subtree: true });
      }
      iframeFallbackTimer = window.setTimeout(() => {
        if (!cancelled && playerRef.current) markReadyFromIframe(host);
      }, IFRAME_READY_FALLBACK_MS);
    };

    const saved =
      artifactId != null ? readPlaybackSecondsFromSession(artifactId) : null;
    const initialStart = Math.max(
      0,
      Math.floor(saved ?? startRef.current ?? startSeconds),
    );
    startRef.current = initialStart;

    let initAttempts = 0;

    const initPlayer = () => {
      if (cancelled) return false;
      if (!mountRef.current || !videoId || !window.YT?.Player) {
        // #region agent log
        if (initAttempts === 0 || initAttempts % 60 === 0) {
          dbgYt("H1", "init blocked: mount/api", {
            initAttempts,
            hasMount: Boolean(mountRef.current),
            hasVideoId: Boolean(videoId),
            hasYtPlayer: Boolean(window.YT?.Player),
          });
        }
        // #endregion
        return false;
      }

      const host = playerHostElement(mountRef.current);
      if (!hostHasLayout(host)) {
        // #region agent log
        if (initAttempts === 0 || initAttempts % 60 === 0) {
          const { w, h } = hostLayoutPx(host);
          dbgYt("H2", "init blocked: host size", {
            initAttempts,
            hostW: w,
            hostH: h,
          });
        }
        // #endregion
        return false;
      }

      if (playerRef.current && mountedVideoIdRef.current === videoId) {
        if (iframeAttachedToMount(mountRef.current)) {
          syncPlayerSize(host!);
          setReady(true);
          setLoading(false);
          setInitTimedOut(false);
          applyPendingSeek();
          // #region agent log
          dbgYt("H6", "init reused existing player", {
            hostW: host.clientWidth,
            hostH: host.clientHeight,
          });
          // #endregion
          return true;
        }
        // #region agent log
        dbgYt("H5", "orphan player — iframe not in mount, recreating", { videoId });
        // #endregion
        destroyPlayer();
      }

      if (playerRef.current) destroyPlayer();

      try {
        // #region agent log
        const { w: hostW, h: hostH } = hostLayoutPx(host!);
        dbgYt("H6", "creating YT.Player", {
          hostW,
          hostH,
          videoId,
        });
        // #endregion
        playerRef.current = new window.YT.Player(mountRef.current, {
          videoId,
          width: hostW,
          height: hostH,
          playerVars: {
            start: initialStart,
            controls: 1,
            fs: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            autoplay: 0,
          },
          events: {
            onReady: () => {
              if (!cancelled) {
                const mount = mountRef.current;
                const attached = iframeAttachedToMount(mount);
                const layoutHost = playerHostElement(mount) ?? host;
                const { w: hostW, h: hostH } = hostLayoutPx(layoutHost);
                // #region agent log
                dbgYt("H4", "YT onReady", {
                  hostW,
                  hostH,
                  hasIframe: attached,
                  accepted: attached,
                });
                // #endregion
                clearIframeFallback();
                if (!attached) return;
                setReady(true);
                setLoading(false);
                setInitTimedOut(false);
                if (layoutHost && hostHasLayout(layoutHost)) syncPlayerSize(layoutHost);
                applyPendingSeek();
                if (resumeOnVisibleRef.current) {
                  resumeOnVisibleRef.current = false;
                  resumeIfWasPlaying(true);
                }
              }
            },
            onStateChange: (e) => {
              const PS = window.YT?.PlayerState;
              if (!PS) return;
              if (e.data === PS.PLAYING) {
                playingRef.current = true;
                setPlaying(true);
              } else if (e.data === PS.BUFFERING) {
                if (playingRef.current) setPlaying(true);
              } else if (
                e.data === PS.PAUSED ||
                e.data === PS.ENDED ||
                e.data === PS.UNSTARTED ||
                e.data === PS.CUED
              ) {
                playingRef.current = false;
                setPlaying(false);
              }
            },
          },
        });
        mountedVideoIdRef.current = videoId;
        setLoading(false);
        armIframeLoadFallback(host!);
      } catch (err) {
        // #region agent log
        dbgYt("H3", "YT.Player create threw", {
          err: err instanceof Error ? err.message : String(err),
        });
        // #endregion
        console.error("[useYouTubeEmbedPlayer] failed to create player", err);
        destroyPlayer();
        setLoading(false);
        return false;
      }
      return true;
    };

    const canReuse =
      playerRef.current &&
      mountedVideoIdRef.current === videoId &&
      iframeAttachedToMount(mountRef.current);
    if (!canReuse) {
      setReady(false);
      setLoading(true);
      setInitTimedOut(false);
    }
    const scheduleInit = () => {
      if (cancelled) return;
      if (initPlayer()) return;
      initAttempts += 1;
      if (initAttempts > MAX_INIT_ATTEMPTS) {
        // #region agent log
        dbgYt("H2", "init timed out (max attempts)", {
          initAttempts,
          hasMount: Boolean(mountRef.current),
          hostW: mountRef.current?.parentElement?.clientWidth ?? 0,
          hostH: mountRef.current?.parentElement?.clientHeight ?? 0,
        });
        // #endregion
        setLoading(false);
        setInitTimedOut(true);
        return;
      }
      raf = window.requestAnimationFrame(scheduleInit);
    };

    void loadYouTubeIframeApi().then(() => {
      if (!cancelled) scheduleInit();
    });

    return () => {
      cancelled = true;
      clearIframeFallback();
      if (raf) window.cancelAnimationFrame(raf);
      persistPlayback();
    };
  }, [
    artifactId,
    destroyPlayer,
    enabled,
    persistPlayback,
    applyPendingSeek,
    resumeIfWasPlaying,
    syncPlayerSize,
    videoId,
    reinitNonce,
  ]);

  useEffect(() => {
    hookMountedRef.current = true;
    return () => {
      hookMountedRef.current = false;
      persistPlayback();
      // Defer destroy so Strict Mode remount can reuse the iframe before onReady fires.
      queueMicrotask(() => {
        if (!hookMountedRef.current) destroyPlayer();
      });
    };
  }, [destroyPlayer, persistPlayback]);

  useLayoutEffect(() => {
    const host = mountRef.current?.parentElement;
    if (!host || !playerRef.current) return;

    const wasPlaying = playingRef.current;
    const sync = () => syncPlayerSize(host);
    sync();
    const ro = new ResizeObserver(() => sync());
    ro.observe(host);

    // Shell moves between inline anchor and PiP coords without reparenting; re-measure and resume.
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      sync();
      raf2 = window.requestAnimationFrame(() => {
        sync();
        if (wasPlaying) resumeIfWasPlaying(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [layoutKey, ready, resumeIfWasPlaying, syncPlayerSize]);

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
    (seconds: number, options?: { play?: boolean }) => {
      const s = Math.max(0, Math.floor(seconds));
      startRef.current = s;
      if (artifactId) writePlaybackSecondsToSession(artifactId, s);
      if (!playerRef.current) {
        pendingSeekRef.current = s;
        return;
      }
      try {
        playerRef.current.seekTo(s, true);
        pendingSeekRef.current = null;
        if (options?.play) {
          playerRef.current.playVideo();
        }
      } catch {
        pendingSeekRef.current = s;
      }
    },
    [artifactId],
  );

  const getIsPlaying = useCallback(() => playingRef.current, []);

  const playVideo = useCallback(() => {
    playingRef.current = true;
    setPlaying(true);
    try {
      playerRef.current?.playVideo();
    } catch {
      /* player not ready */
    }
  }, []);

  const pauseVideo = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* player not ready */
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (playingRef.current) pauseVideo();
    else playVideo();
  }, [pauseVideo, playVideo]);

  const reinit = useCallback(() => {
    destroyPlayer();
    setInitTimedOut(false);
    setLoading(true);
    setReinitNonce((n) => n + 1);
  }, [destroyPlayer]);

  return useMemo(
    () => ({
      mountRef,
      playerReady: ready,
      playerLoading: loading,
      playerInitTimedOut: initTimedOut,
      isPlaying: playing,
      getIsPlaying,
      getCurrentTime,
      seekTo,
      playVideo,
      pauseVideo,
      togglePlayback,
      reinit,
    }),
    [
      getCurrentTime,
      getIsPlaying,
      initTimedOut,
      loading,
      pauseVideo,
      playVideo,
      playing,
      ready,
      seekTo,
      togglePlayback,
      reinit,
    ],
  );
}
