import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { isArtifactPipVideo, useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import { useArtifactPlaybackPersistence } from "@/hooks/useArtifactPlaybackPersistence";
import { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import { useStaticYouTubeEmbedTelemetry } from "@/hooks/useStaticYouTubeEmbedTelemetry";
import { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import { readPlaybackSecondsLocal } from "@/lib/framework/artifactPlaybackProgress";
import { embedNeedsResumeSeek, resolveEmbedPlaybackSeconds } from "@/lib/framework/playbackSeconds";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { buildYouTubeEmbedSrc } from "@/lib/youtube/embed";

export function useArtifactVideoPlayback(options: {
  artifactId: string | undefined;
  youTubeVideoId: string | null;
  mainScrollRef: RefObject<HTMLDivElement | null>;
  transcriptSegments: TranscriptSegment[];
  transcriptRefs: RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const { artifactId, youTubeVideoId, mainScrollRef, transcriptSegments, transcriptRefs } = options;
  const playbackPersistence = useArtifactPlaybackPersistence(artifactId);
  const { resolvedSeconds: savedStart, loaded: playbackLoaded, persistSeconds } =
    playbackPersistence;
  const playbackFallbackRef = useRef(savedStart);
  const playWhenReadyRef = useRef(false);
  const layoutMode = useArtifactLayoutMode();
  const pipEnabled = isArtifactPipVideo(layoutMode, Boolean(youTubeVideoId));

  const embedVisibleRef = useRef(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  /** API player only for transcript seek / capture — not for scroll PiP. */
  const [apiPlayerWanted, setApiPlayerWanted] = useState(false);
  const [staticEmbedStart, setStaticEmbedStart] = useState(() =>
    artifactId ? (readPlaybackSecondsLocal(artifactId) ?? 0) : 0,
  );
  const [apiStartSeconds, setApiStartSeconds] = useState(() =>
    artifactId ? (readPlaybackSecondsLocal(artifactId) ?? 0) : 0,
  );
  const appliedRemoteResumeRef = useRef(false);
  const resumeStaticOnVisibleRef = useRef(false);

  const youtubePip = useArtifactYoutubePip({
    artifactId,
    enabled: pipEnabled,
    mainScrollRef,
    embedVisibleRef,
  });

  useEffect(() => {
    appliedRemoteResumeRef.current = false;
    const local = artifactId ? (readPlaybackSecondsLocal(artifactId) ?? 0) : 0;
    playbackFallbackRef.current = local;
    setStaticEmbedStart(local);
    setApiStartSeconds(local);
  }, [artifactId, youTubeVideoId]);

  useEffect(() => {
    if (!playbackLoaded || !artifactId) return;
    playbackFallbackRef.current = savedStart;
    setApiStartSeconds(savedStart);
    if (!embedLoaded) setStaticEmbedStart(savedStart);
  }, [artifactId, embedLoaded, playbackLoaded, savedStart]);

  const staticTelemetry = useStaticYouTubeEmbedTelemetry({
    videoSlotRef: youtubePip.videoSlotRef,
    enabled: Boolean(youTubeVideoId) && !apiPlayerWanted,
    initialSeconds: staticEmbedStart,
  });

  const youtubePlayer = useYouTubeEmbedPlayer({
    videoId: youTubeVideoId,
    enabled: Boolean(youTubeVideoId) && apiPlayerWanted,
    startSeconds: apiStartSeconds,
    artifactId: artifactId ?? null,
    getSavedPlaybackSeconds: () => savedStart,
    onPersistPlaybackSeconds: persistSeconds,
    layoutKey: youtubePip.pipMode ? "pip" : "inline",
  });

  useEffect(() => {
    playWhenReadyRef.current = false;
    embedVisibleRef.current = false;
    setEmbedLoaded(false);
    setApiPlayerWanted(false);
  }, [artifactId, youTubeVideoId]);

  useEffect(() => {
    if (!youtubePlayer.playerReady || !playWhenReadyRef.current) return;
    playWhenReadyRef.current = false;
    youtubePlayer.playVideo();
  }, [youtubePlayer.playerReady, youtubePlayer.playVideo]);

  useEffect(() => {
    if (!playbackLoaded || appliedRemoteResumeRef.current || savedStart <= 0) return;
    if (!embedLoaded || apiPlayerWanted) return;
    appliedRemoteResumeRef.current = true;
    staticTelemetry.seekTo(savedStart, true);
    playbackFallbackRef.current = savedStart;
  }, [
    apiPlayerWanted,
    embedLoaded,
    playbackLoaded,
    savedStart,
    staticTelemetry,
  ]);

  useEffect(() => {
    if (!apiPlayerWanted || !youtubePlayer.playerReady) return;
    const tick = window.setInterval(() => {
      const t = youtubePlayer.getCurrentTime();
      playbackFallbackRef.current = t;
      persistSeconds(t);
    }, 2000);
    return () => window.clearInterval(tick);
  }, [
    apiPlayerWanted,
    persistSeconds,
    youtubePlayer.playerReady,
    youtubePlayer.getCurrentTime,
  ]);

  useEffect(() => {
    if (apiPlayerWanted || !artifactId) return;
    const tick = window.setInterval(() => {
      const t = staticTelemetry.getCurrentTime();
      playbackFallbackRef.current = t;
      persistSeconds(t);
    }, 2000);
    return () => window.clearInterval(tick);
  }, [apiPlayerWanted, artifactId, persistSeconds, staticTelemetry]);

  /** Static embed stays mounted; resume if YouTube pauses during inline ↔ PiP reposition. */
  useEffect(() => {
    if (apiPlayerWanted || !pipEnabled) return;
    if (!staticTelemetry.isPlayingRef.current) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        staticTelemetry.playVideo();
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [apiPlayerWanted, pipEnabled, staticTelemetry, youtubePip.pipMode]);

  const restoreStaticEmbedProgress = useCallback(
    (opts?: { resume?: boolean; forceSeek?: boolean }) => {
      if (apiPlayerWanted) return;
      const seconds = Math.max(0, Math.floor(playbackFallbackRef.current));
      const live = staticTelemetry.getCurrentTime();
      const fresh = staticTelemetry.isTelemetryFresh(800);
      const shouldSeek =
        opts?.forceSeek ||
        embedNeedsResumeSeek(live, seconds, fresh, Boolean(opts?.resume));
      if (shouldSeek && seconds > 0) staticTelemetry.seekTo(seconds, true);
      if (opts?.resume && !staticTelemetry.getIsPlaying()) staticTelemetry.playVideo();
    },
    [apiPlayerWanted, staticTelemetry],
  );

  /** Tab/app background: persist position; on return, resume only — seek if iframe lost place. */
  useEffect(() => {
    if (apiPlayerWanted) return;

    const resumeAfterVisible = (shouldResume: boolean) => {
      staticTelemetry.requestCurrentTime();
      window.setTimeout(() => {
        const live = staticTelemetry.getCurrentTime();
        const saved = playbackFallbackRef.current;
        const resolved = Math.max(saved, Number.isFinite(live) ? live : 0);
        playbackFallbackRef.current = resolved;
        persistSeconds(resolved);

        const fresh = staticTelemetry.isTelemetryFresh(800);
        if (embedNeedsResumeSeek(live, saved, fresh, shouldResume) && resolved > 0) {
          staticTelemetry.seekTo(resolved, true);
        }
        if (shouldResume && !staticTelemetry.getIsPlaying()) {
          staticTelemetry.playVideo();
        }
      }, 80);
    };

    const onVisibility = () => {
      if (document.hidden) {
        resumeStaticOnVisibleRef.current = staticTelemetry.getIsPlaying();
        const t = staticTelemetry.getCurrentTime();
        playbackFallbackRef.current = t;
        persistSeconds(t);
        return;
      }
      const shouldResume = resumeStaticOnVisibleRef.current;
      resumeStaticOnVisibleRef.current = false;
      resumeAfterVisible(shouldResume);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const shouldResume = resumeStaticOnVisibleRef.current;
      resumeStaticOnVisibleRef.current = false;
      resumeAfterVisible(shouldResume);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [apiPlayerWanted, persistSeconds, staticTelemetry]);

  const onStaticEmbedLoad = useCallback(() => {
    embedVisibleRef.current = true;
    setEmbedLoaded(true);
    restoreStaticEmbedProgress({ forceSeek: true });
  }, [restoreStaticEmbedProgress]);

  const staticEmbedSrc = useMemo(() => {
    if (!youTubeVideoId) return null;
    return buildYouTubeEmbedSrc(youTubeVideoId, staticEmbedStart);
  }, [youTubeVideoId, staticEmbedStart]);

  const enableApiPlayer = useCallback(() => {
    const seconds = staticTelemetry.getCurrentTime();
    playbackFallbackRef.current = seconds;
    persistSeconds(seconds);
    setApiStartSeconds(seconds);
    setApiPlayerWanted(true);
  }, [persistSeconds, staticTelemetry]);

  const activatePlayer = useCallback(
    (opts?: { autoplay?: boolean }) => {
      enableApiPlayer();
      if (opts?.autoplay) playWhenReadyRef.current = true;
    },
    [enableApiPlayer],
  );

  const lastSeekScrollRef = useRef({ at: 0, seconds: -1 });

  const scrollTranscriptToSeconds = useCallback(
    (seconds: number) => {
      const now = Date.now();
      if (
        lastSeekScrollRef.current.seconds === seconds &&
        now - lastSeekScrollRef.current.at < 300
      ) {
        return;
      }
      lastSeekScrollRef.current = { at: now, seconds };
      const source = transcriptSegments
        .filter(
          (segment) =>
            !segment.isParagraphBreak && segment.startSeconds != null && segment.startSeconds <= seconds,
        )
        .sort((left, right) => (right.startSeconds ?? 0) - (left.startSeconds ?? 0))[0];
      if (source) transcriptRefs.current[source.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [transcriptSegments, transcriptRefs],
  );

  const seekVideoToSeconds = useCallback(
    (seconds: number, opts?: { play?: boolean }) => {
      const start = Math.max(0, Math.floor(seconds));
      playbackFallbackRef.current = start;
      persistSeconds(start);

      if (apiPlayerWanted && youtubePlayer.playerReady) {
        youtubePlayer.seekTo(start, { play: opts?.play });
      } else if (!apiPlayerWanted) {
        staticTelemetry.seekTo(start, true);
        if (opts?.play) staticTelemetry.playVideo();
      } else {
        setApiStartSeconds(start);
        enableApiPlayer();
        if (opts?.play) activatePlayer({ autoplay: true });
        youtubePlayer.seekTo(start, { play: opts?.play });
      }
      scrollTranscriptToSeconds(start);
    },
    [
      activatePlayer,
      apiPlayerWanted,
      enableApiPlayer,
      persistSeconds,
      scrollTranscriptToSeconds,
      staticTelemetry,
      youtubePlayer.playerReady,
      youtubePlayer.seekTo,
    ],
  );

  const activateAndPlay = useCallback(() => {
    if (apiPlayerWanted) {
      activatePlayer({ autoplay: true });
    } else {
      staticTelemetry.playVideo();
    }
  }, [activatePlayer, apiPlayerWanted, staticTelemetry]);

  const togglePlayback = useCallback(() => {
    if (apiPlayerWanted) {
      if (youtubePlayer.playerReady) {
        youtubePlayer.togglePlayback();
      } else {
        activatePlayer({ autoplay: true });
      }
      return;
    }
    staticTelemetry.togglePlayback();
  }, [
    activatePlayer,
    apiPlayerWanted,
    staticTelemetry,
    youtubePlayer.playerReady,
    youtubePlayer.togglePlayback,
  ]);

  const getPlaybackSeconds = useCallback(() => {
    if (apiPlayerWanted && youtubePlayer.playerReady) return youtubePlayer.getCurrentTime();
    const staticTime = staticTelemetry.getCurrentTime();
    const fallback = playbackFallbackRef.current;
    const fresh = staticTelemetry.isTelemetryFresh(2500);
    return resolveEmbedPlaybackSeconds(staticTime, fallback, fresh);
  }, [
    apiPlayerWanted,
    staticTelemetry,
    youtubePlayer.playerReady,
    youtubePlayer.getCurrentTime,
  ]);

  const resyncPlaybackPosition = useCallback(() => {
    if (apiPlayerWanted && youtubePlayer.playerReady) {
      playbackFallbackRef.current = youtubePlayer.getCurrentTime();
      return;
    }
    staticTelemetry.requestCurrentTime();
    window.setTimeout(() => {
      const t = staticTelemetry.getCurrentTime();
      if (Number.isFinite(t) && t >= 0) {
        playbackFallbackRef.current = Math.max(playbackFallbackRef.current, t);
      }
    }, 100);
  }, [apiPlayerWanted, staticTelemetry, youtubePlayer.getCurrentTime, youtubePlayer.playerReady]);

  const isPlaying = apiPlayerWanted ? youtubePlayer.isPlaying : staticTelemetry.isPlaying;

  const getIsPlaying = useCallback(() => {
    if (apiPlayerWanted) return youtubePlayer.getIsPlaying();
    return staticTelemetry.getIsPlaying();
  }, [apiPlayerWanted, staticTelemetry, youtubePlayer.getIsPlaying]);

  const pauseVideo = useCallback(() => {
    if (apiPlayerWanted) youtubePlayer.pauseVideo();
    else staticTelemetry.pauseVideo();
  }, [apiPlayerWanted, staticTelemetry, youtubePlayer.pauseVideo]);

  const playVideo = useCallback(() => {
    if (apiPlayerWanted) youtubePlayer.playVideo();
    else staticTelemetry.playVideo();
  }, [apiPlayerWanted, staticTelemetry, youtubePlayer.playVideo]);

  return {
    pipEnabled,
    youtubePip,
    youtubePlayer,
    persistSeconds,
    playbackFallbackRef,
    seekVideoToSeconds,
    scrollTranscriptToSeconds,
    getPlaybackSeconds,
    activatePlayer,
    activateAndPlay,
    togglePlayback,
    isPlaying,
    getIsPlaying,
    pauseVideo,
    playVideo,
    resyncPlaybackPosition,
    staticEmbedSrc,
    onStaticEmbedLoad,
    showApiPlayer: apiPlayerWanted,
    useStaticPip: pipEnabled && !apiPlayerWanted,
    playerReady: apiPlayerWanted ? youtubePlayer.playerReady : embedLoaded,
  };
}
