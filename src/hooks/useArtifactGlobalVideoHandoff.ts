import { useEffect, useRef } from "react";
import { useArtifactGlobalVideoPipStore } from "@/lib/framework/artifactGlobalVideoPipStore";
import type { ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

export function useArtifactGlobalVideoHandoff(options: {
  artifactId: string | undefined;
  youTubeVideoId: string | null;
  title: string | null;
  getPlaybackSeconds: () => number;
  getIsPlaying: () => boolean;
  persistSeconds: (seconds: number) => void;
  pipLayout?: ArtifactPipLayout;
}) {
  const { artifactId, youTubeVideoId, title, getPlaybackSeconds, getIsPlaying, persistSeconds, pipLayout } =
    options;

  const getPlaybackSecondsRef = useRef(getPlaybackSeconds);
  const getIsPlayingRef = useRef(getIsPlaying);
  const persistSecondsRef = useRef(persistSeconds);
  const pipLayoutRef = useRef(pipLayout);

  getPlaybackSecondsRef.current = getPlaybackSeconds;
  getIsPlayingRef.current = getIsPlaying;
  persistSecondsRef.current = persistSeconds;
  pipLayoutRef.current = pipLayout;

  useEffect(() => {
    if (!artifactId) return;
    const { session, dismiss } = useArtifactGlobalVideoPipStore.getState();
    if (session?.artifactId === artifactId) dismiss();
  }, [artifactId]);

  useEffect(() => {
    return () => {
      if (!artifactId || !youTubeVideoId) return;
      if (!getIsPlayingRef.current()) return;

      const seconds = getPlaybackSecondsRef.current();
      persistSecondsRef.current(seconds);

      useArtifactGlobalVideoPipStore.getState().startSession({
        artifactId,
        youTubeVideoId,
        title,
        startSeconds: seconds,
        resumePlayback: true,
        layout: pipLayoutRef.current,
      });
    };
  }, [artifactId, title, youTubeVideoId]);
}
