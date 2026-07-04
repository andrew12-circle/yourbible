import { create } from "zustand";
import type { DocumentPipSession } from "@/lib/youtube/documentPictureInPicture";

export type ArtifactGlobalDocumentPipSession = {
  artifactId: string;
  youTubeVideoId: string;
  title: string | null;
};

export type DocumentPipPopoutPlayback = {
  seconds: number;
  playing: boolean;
};

type SyncInlineFn = (seconds: number, resume: boolean) => void;

/** Module-level PiP window handle — survives route changes. */
export const globalDocumentPipSessionRef: { current: DocumentPipSession | null } = { current: null };

const syncInlineRef: { current: SyncInlineFn | null } = { current: null };
const activateHandlerRef: { current: (() => void) | null } = { current: null };

interface ArtifactGlobalDocumentPipState {
  session: ArtifactGlobalDocumentPipSession | null;
  active: boolean;
  popoutPlayback: DocumentPipPopoutPlayback;
  setSession: (session: ArtifactGlobalDocumentPipSession | null) => void;
  setActive: (active: boolean) => void;
  setPopoutPlayback: (playback: DocumentPipPopoutPlayback) => void;
  clear: () => void;
}

export const useArtifactGlobalDocumentPipStore = create<ArtifactGlobalDocumentPipState>((set) => ({
  session: null,
  active: false,
  popoutPlayback: { seconds: 0, playing: false },

  setSession: (session) => set({ session }),
  setActive: (active) => set({ active }),
  setPopoutPlayback: (popoutPlayback) => set({ popoutPlayback }),
  clear: () =>
    set({
      session: null,
      active: false,
      popoutPlayback: { seconds: 0, playing: false },
    }),
}));

export function registerDocumentPipSyncInline(fn: SyncInlineFn | null): void {
  syncInlineRef.current = fn;
}

export function registerDocumentPipActivateHandler(fn: (() => void) | null): void {
  activateHandlerRef.current = fn;
}

export function triggerDocumentPipActivate(): void {
  activateHandlerRef.current?.();
}

export function syncInlineFromDocumentPip(resume: boolean, popoutPlayback: DocumentPipPopoutPlayback): void {
  syncInlineRef.current?.(popoutPlayback.seconds, resume || popoutPlayback.playing);
}

export function getGlobalDocumentPipSessionRef(): { current: DocumentPipSession | null } {
  return globalDocumentPipSessionRef;
}
