import { useEffect, useRef, type RefObject } from "react";
import { useStaticYouTubeEmbedTelemetry } from "@/hooks/useStaticYouTubeEmbedTelemetry";
import { useArtifactGlobalVideoPipStore } from "@/lib/framework/artifactGlobalVideoPipStore";

/** Continue a saved live-stream artifact in the global PiP when leaving the live workspace. */
export function useLiveStreamGlobalHandoff(options: {
  artifactId: string | null;
  youTubeVideoId: string | null;
  title: string | null;
  videoSlotRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
}) {
  const { artifactId, youTubeVideoId, title, videoSlotRef, enabled } = options;

  const staticTelemetry = useStaticYouTubeEmbedTelemetry({
    videoSlotRef,
    enabled: enabled && Boolean(youTubeVideoId),
    initialSeconds: 0,
    syncBackgroundPlayback: true,
  });

  const getWantsContinuousPlaybackRef = useRef(staticTelemetry.getWantsContinuousPlayback);
  getWantsContinuousPlaybackRef.current = staticTelemetry.getWantsContinuousPlayback;

  useEffect(() => {
    if (!artifactId) return;
    const { session, dismiss } = useArtifactGlobalVideoPipStore.getState();
    if (session?.artifactId === artifactId) dismiss();
  }, [artifactId]);

  useEffect(() => {
    return () => {
      if (!enabled || !artifactId || !youTubeVideoId) return;
      const existing = useArtifactGlobalVideoPipStore.getState().session;
      if (existing?.artifactId === artifactId) return;
      if (!getWantsContinuousPlaybackRef.current()) return;

      useArtifactGlobalVideoPipStore.getState().startSession({
        artifactId,
        youTubeVideoId,
        title,
        startSeconds: 0,
        resumePlayback: true,
        isLiveBroadcast: true,
      });
    };
  }, [artifactId, enabled, title, youTubeVideoId]);

  return staticTelemetry;
}
