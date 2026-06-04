import { useArtifactGlobalVideoPipStore } from "@/lib/framework/artifactGlobalVideoPipStore";
import type { ArtifactPipLayout } from "@/lib/framework/artifactYoutubePip";

/** Where the full journal editor should return after opening from an artifact. */
export function artifactJournalReturnPath(artifactId: string): string {
  return `/framework/artifacts/${artifactId}#journal`;
}

export function handoffArtifactVideoForJournal(options: {
  artifactId: string;
  youTubeVideoId: string;
  title: string | null;
  getPlaybackSeconds: () => number;
  getIsPlaying: () => boolean;
  persistSeconds: (seconds: number) => void;
  pipLayout?: ArtifactPipLayout;
}) {
  const seconds = Math.max(0, options.getPlaybackSeconds());
  options.persistSeconds(seconds);
  useArtifactGlobalVideoPipStore.getState().startSession({
    artifactId: options.artifactId,
    youTubeVideoId: options.youTubeVideoId,
    title: options.title,
    startSeconds: seconds,
    resumePlayback: options.getIsPlaying(),
    layout: options.pipLayout,
  });
}
