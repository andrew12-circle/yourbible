import { useEffect, useRef } from "react";
import { useArtifactGlobalVideoPipStore } from "@/lib/framework/artifactGlobalVideoPipStore";
import type { ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

export function useArtifactGlobalVideoHandoff(options: {
  artifactId: string | undefined;
  youTubeVideoId: string | null;
  title: string | null;
  getPlaybackSeconds: () => number;
  /** True when playback should continue after leaving the artifact page (playing or user has not paused). */
  getWantsContinuousPlayback: () => boolean;
  persistSeconds: (seconds: number) => void;
  pipLayout?: ArtifactPipLayout;
}) {
  const {
    artifactId,
    youTubeVideoId,
    title,
    getPlaybackSeconds,
    getWantsContinuousPlayback,
    persistSeconds,
    pipLayout,
  } = options;

  const getPlaybackSecondsRef = useRef(getPlaybackSeconds);
  const getWantsContinuousPlaybackRef = useRef(getWantsContinuousPlayback);
  const persistSecondsRef = useRef(persistSeconds);
  const pipLayoutRef = useRef(pipLayout);

  getPlaybackSecondsRef.current = getPlaybackSeconds;
  getWantsContinuousPlaybackRef.current = getWantsContinuousPlayback;
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
      const existing = useArtifactGlobalVideoPipStore.getState().session;
      if (existing?.artifactId === artifactId) return;
      if (!getWantsContinuousPlaybackRef.current()) return;

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

export function startArtifactGlobalVideoHandoff(input: {
  artifactId: string;
  youTubeVideoId: string;
  title: string | null;
  startSeconds: number;
  layout?: ArtifactPipLayout;
}): void {
  useArtifactGlobalVideoPipStore.getState().startSession({
    artifactId: input.artifactId,
    youTubeVideoId: input.youTubeVideoId,
    title: input.title,
    startSeconds: input.startSeconds,
    resumePlayback: true,
    layout: input.layout,
  });
}
