import { useCallback, useRef, type RefObject } from "react";
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

  const youtubePip = useArtifactYoutubePip({
    artifactId,
    enabled: Boolean(youTubeVideoId),
    mainScrollRef,
  });

  const youtubePlayer = useYouTubeEmbedPlayer({
    videoId: youTubeVideoId,
    enabled: Boolean(youTubeVideoId),
    startSeconds: 0,
    artifactId: artifactId ?? null,
    layoutKey: youtubePip.youtubeLayoutKey,
  });

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
      youtubePlayer.seekTo(start, { play: opts?.play });
      scrollTranscriptToSeconds(start);
    },
    [scrollTranscriptToSeconds, youtubePlayer.seekTo],
  );

  const getPlaybackSeconds = useCallback(() => {
    if (youtubePlayer.playerReady) return youtubePlayer.getCurrentTime();
    return playbackFallbackRef.current;
  }, [youtubePlayer.playerReady, youtubePlayer.getCurrentTime]);

  return {
    youtubePip,
    youtubePlayer,
    playbackFallbackRef,
    seekVideoToSeconds,
    scrollTranscriptToSeconds,
    getPlaybackSeconds,
  };
}
