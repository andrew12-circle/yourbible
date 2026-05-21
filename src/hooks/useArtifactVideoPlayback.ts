import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { isArtifactPipVideo, useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import { useArtifactYoutubePip } from "@/hooks/useArtifactYoutubePip";
import { useYouTubeEmbedPlayer } from "@/hooks/useYouTubeEmbedPlayer";
import type { TranscriptSegment } from "@/lib/transcriptSplit";

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

  const playerReadyRef = useRef(false);

  const youtubePip = useArtifactYoutubePip({
    artifactId,
    enabled: pipEnabled,
    mainScrollRef,
    playerReadyRef,
  });

  /** Mount the real YouTube iframe in the page — no custom thumbnail shell on the main player. */
  const embedEnabled = Boolean(youTubeVideoId);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7557/ingest/d8ad423f-f74d-4738-aea6-21deae4ae80c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c783b2" },
      body: JSON.stringify({
        sessionId: "c783b2",
        hypothesisId: "H1",
        location: "useArtifactVideoPlayback.ts",
        message: "playback mount",
        data: { embedEnabled, youTubeVideoId, pipEnabled, layoutMode },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [embedEnabled, youTubeVideoId, pipEnabled, layoutMode]);

  const youtubePlayer = useYouTubeEmbedPlayer({
    videoId: youTubeVideoId,
    enabled: embedEnabled,
    startSeconds: 0,
    artifactId: artifactId ?? null,
    layoutKey: youtubePip.youtubeLayoutKey,
  });

  useEffect(() => {
    playWhenReadyRef.current = false;
  }, [artifactId, youTubeVideoId]);

  useEffect(() => {
    playerReadyRef.current = youtubePlayer.playerReady;
  }, [youtubePlayer.playerReady]);

  useEffect(() => {
    if (!youtubePlayer.playerReady || !playWhenReadyRef.current) return;
    playWhenReadyRef.current = false;
    youtubePlayer.playVideo();
  }, [youtubePlayer.playerReady, youtubePlayer.playVideo]);

  const activatePlayer = useCallback((opts?: { autoplay?: boolean }) => {
    if (opts?.autoplay) playWhenReadyRef.current = true;
  }, []);

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
      if (opts?.play) activatePlayer({ autoplay: true });
      youtubePlayer.seekTo(start, { play: opts?.play });
      scrollTranscriptToSeconds(start);
    },
    [activatePlayer, scrollTranscriptToSeconds, youtubePlayer.seekTo],
  );

  const activateAndPlay = useCallback(() => {
    activatePlayer({ autoplay: true });
  }, [activatePlayer]);

  const togglePlayback = useCallback(() => {
    if (!youtubePlayer.playerReady) {
      activateAndPlay();
      return;
    }
    youtubePlayer.togglePlayback();
  }, [activateAndPlay, youtubePlayer.playerReady, youtubePlayer.togglePlayback]);

  const getPlaybackSeconds = useCallback(() => {
    if (youtubePlayer.playerReady) return youtubePlayer.getCurrentTime();
    return playbackFallbackRef.current;
  }, [youtubePlayer.playerReady, youtubePlayer.getCurrentTime]);

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
  };
}
