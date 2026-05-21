import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { isArtifactPipVideo, useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import { useStaticYouTubeEmbedTelemetry } from "@/hooks/useStaticYouTubeEmbedTelemetry";
import { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import {
  readPlaybackSecondsFromSession,
  writePlaybackSecondsToSession,
} from "@/lib/framework/artifactYoutubePip";
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
  const playbackFallbackRef = useRef(0);
  const playWhenReadyRef = useRef(false);
  const layoutMode = useArtifactLayoutMode();
  const pipEnabled = isArtifactPipVideo(layoutMode, Boolean(youTubeVideoId));

  const embedVisibleRef = useRef(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  /** API player only for transcript seek / capture — not for scroll PiP. */
  const [apiPlayerWanted, setApiPlayerWanted] = useState(false);
  const [staticEmbedStart, setStaticEmbedStart] = useState(0);
  const [apiStartSeconds, setApiStartSeconds] = useState(0);

  const youtubePip = useArtifactYoutubePip({
    artifactId,
    enabled: pipEnabled,
    mainScrollRef,
    embedVisibleRef,
  });

  const savedStart = useMemo(() => {
    if (!artifactId) return 0;
    const t = readPlaybackSecondsFromSession(artifactId);
    return t != null ? t : 0;
  }, [artifactId]);

  useEffect(() => {
    playbackFallbackRef.current = savedStart;
    setStaticEmbedStart(savedStart);
    setApiStartSeconds(savedStart);
  }, [artifactId, youTubeVideoId, savedStart]);

  const staticTelemetry = useStaticYouTubeEmbedTelemetry({
    videoSlotRef: youtubePip.videoSlotRef,
    enabled: Boolean(youTubeVideoId) && !apiPlayerWanted,
    initialSeconds: savedStart,
  });

  const youtubePlayer = useYouTubeEmbedPlayer({
    videoId: youTubeVideoId,
    enabled: Boolean(youTubeVideoId) && apiPlayerWanted,
    startSeconds: apiStartSeconds,
    artifactId: artifactId ?? null,
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
    if (!apiPlayerWanted || !youtubePlayer.playerReady) return;
    const tick = window.setInterval(() => {
      const t = youtubePlayer.getCurrentTime();
      playbackFallbackRef.current = t;
      if (artifactId) writePlaybackSecondsToSession(artifactId, t);
    }, 2000);
    return () => window.clearInterval(tick);
  }, [apiPlayerWanted, artifactId, youtubePlayer.playerReady, youtubePlayer.getCurrentTime]);

  useEffect(() => {
    if (apiPlayerWanted || !artifactId) return;
    const tick = window.setInterval(() => {
      const t = staticTelemetry.getCurrentTime();
      playbackFallbackRef.current = t;
      writePlaybackSecondsToSession(artifactId, t);
    }, 2000);
    return () => window.clearInterval(tick);
  }, [apiPlayerWanted, artifactId, staticTelemetry]);

  const onStaticEmbedLoad = useCallback(() => {
    embedVisibleRef.current = true;
    setEmbedLoaded(true);
  }, []);

  const staticEmbedSrc = useMemo(() => {
    if (!youTubeVideoId) return null;
    return buildYouTubeEmbedSrc(youTubeVideoId, staticEmbedStart);
  }, [youTubeVideoId, staticEmbedStart]);

  const enableApiPlayer = useCallback(() => {
    const seconds = staticTelemetry.getCurrentTime();
    playbackFallbackRef.current = seconds;
    if (artifactId) writePlaybackSecondsToSession(artifactId, seconds);
    setApiStartSeconds(seconds);
    setApiPlayerWanted(true);
  }, [artifactId, staticTelemetry]);

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
      if (artifactId) writePlaybackSecondsToSession(artifactId, start);

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
      artifactId,
      enableApiPlayer,
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
    if (apiPlayerWanted && youtubePlayer.playerReady) {
      youtubePlayer.togglePlayback();
      return;
    }
    staticTelemetry.togglePlayback();
  }, [apiPlayerWanted, staticTelemetry, youtubePlayer.playerReady, youtubePlayer.togglePlayback]);

  const getPlaybackSeconds = useCallback(() => {
    if (apiPlayerWanted && youtubePlayer.playerReady) return youtubePlayer.getCurrentTime();
    return staticTelemetry.getCurrentTime() || playbackFallbackRef.current;
  }, [
    apiPlayerWanted,
    staticTelemetry,
    youtubePlayer.playerReady,
    youtubePlayer.getCurrentTime,
  ]);

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
    staticEmbedSrc,
    onStaticEmbedLoad,
    showApiPlayer: apiPlayerWanted,
    useStaticPip: pipEnabled && !apiPlayerWanted,
    playerReady: apiPlayerWanted ? youtubePlayer.playerReady : embedLoaded,
  };
}
