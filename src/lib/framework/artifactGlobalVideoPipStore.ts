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
};

export type ArtifactGlobalVideoPipHandoffInput = {
  artifactId: string;
  youTubeVideoId: string;
  title: string | null;
  startSeconds: number;
  resumePlayback: boolean;
  layout?: ArtifactPipLayout;
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
    set({
      session: {
        artifactId: input.artifactId,
        youTubeVideoId: input.youTubeVideoId,
        title: input.title,
        startSeconds: Math.max(0, Math.floor(input.startSeconds)),
        resumePlayback: input.resumePlayback,
        layout: resolveHandoffLayout(input.artifactId, input.layout),
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
