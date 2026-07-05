import { create } from "zustand";
import {
  clampArtifactPipLayout,
  defaultArtifactPipLayout,
  readPipLayoutFromSession,
  type ArtifactPipLayout,
} from "@/lib/framework/artifactYoutubePip";

export type ArtifactGlobalVideoPipSession = {
  artifactId: string;
  youTubeVideoId: string;
  title: string | null;
  startSeconds: number;
  resumePlayback: boolean;
  layout: ArtifactPipLayout;
  /** Live sermon — embed stays at live edge; no VOD resume seeks. */
  isLiveBroadcast: boolean;
};

export type ArtifactGlobalVideoPipHandoffInput = {
  artifactId: string;
  youTubeVideoId: string;
  title: string | null;
  startSeconds: number;
  resumePlayback: boolean;
  layout?: ArtifactPipLayout;
  isLiveBroadcast?: boolean;
};

interface ArtifactGlobalVideoPipState {
  session: ArtifactGlobalVideoPipSession | null;
  startSession: (input: ArtifactGlobalVideoPipHandoffInput) => void;
  dismiss: () => void;
  setLayout: (layout: ArtifactPipLayout) => void;
}

function resolveHandoffLayout(
  artifactId: string,
  layout?: ArtifactPipLayout,
): ArtifactPipLayout {
  const saved = readPipLayoutFromSession(artifactId);
  return clampArtifactPipLayout(layout ?? saved ?? defaultArtifactPipLayout());
}

export const useArtifactGlobalVideoPipStore = create<ArtifactGlobalVideoPipState>((set) => ({
  session: null,

  startSession: (input) => {
    const isLiveBroadcast = Boolean(input.isLiveBroadcast);
    set({
      session: {
        artifactId: input.artifactId,
        youTubeVideoId: input.youTubeVideoId,
        title: input.title,
        startSeconds: isLiveBroadcast ? 0 : Math.max(0, Math.floor(input.startSeconds)),
        resumePlayback: input.resumePlayback,
        layout: resolveHandoffLayout(input.artifactId, input.layout),
        isLiveBroadcast,
      },
    });
  },

  dismiss: () => set({ session: null }),

  setLayout: (layout) =>
    set((state) => {
      if (!state.session) return state;
      return { session: { ...state.session, layout: clampArtifactPipLayout(layout) } };
    }),
}));
